import { chromium } from '@playwright/test';
import type { BrowserContext, Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { HEARTBEAT_PATH, isBackendResponse } from 'src/extension/backend';
import { isConfiguredProfileCurrent, markConfiguredProfileCurrent } from 'src/utils/configured-profile';
import { CONFIGURED_PROFILE_DIRECTORY, TEST_PROFILE_PREFIX, TEST_PROFILES_DIRECTORY, UNPACKED_EXTENSION_DIRECTORY } from 'src/utils/paths';

// 'configured' is a copy of the saved configured profile, 'empty' is the extension as installed, and
// 'setup' is an empty profile that becomes the saved configured profile when its test passes.
export type ExtensionProfile = 'configured' | 'empty' | 'setup';

export type ExtensionContextFixtures = {
  extensionProfile: ExtensionProfile;
  extensionId: string;
};

function createProfileDirectory(extensionProfile: ExtensionProfile): string {
  if (extensionProfile === 'setup') {
    rmSync(CONFIGURED_PROFILE_DIRECTORY, { recursive: true, force: true });
    return CONFIGURED_PROFILE_DIRECTORY;
  }

  mkdirSync(TEST_PROFILES_DIRECTORY, { recursive: true });
  const profileDirectory = mkdtempSync(TEST_PROFILE_PREFIX);

  if (extensionProfile === 'configured') {
    cpSync(CONFIGURED_PROFILE_DIRECTORY, profileDirectory, { recursive: true });
  }

  return profileDirectory;
}

// The extension evaluates no site until its startup heartbeat has answered, so a test that navigates
// sooner gets no decision.
async function waitForStartupHeartbeat(context: BrowserContext): Promise<void> {
  const heartbeat = await context.waitForEvent('response', (response) => isBackendResponse(response, HEARTBEAT_PATH));

  if (!heartbeat.ok()) {
    throw new Error(`The extension's startup heartbeat answered ${heartbeat.status()}`);
  }
}

export const extensionContextFixtures: Fixtures<ExtensionContextFixtures, object, PlaywrightTestArgs> = {
  extensionProfile: ['configured', { option: true }],

  context: async ({ extensionProfile }, use, testInfo) => {
    testInfo.skip(
      extensionProfile === 'setup' && isConfiguredProfileCurrent(),
      'The saved profile matches the extension build, API domain and key',
    );

    const profileDirectory = createProfileDirectory(extensionProfile);
    // The `video` option of the config applies only to contexts Playwright creates itself, so this context
    // records its own tabs and attaches the video of each tab still open at the end to every test, passed
    // or failed. A new profile opens a tab that Chromium closes at once, and its empty video is left out.
    const videoDirectory = testInfo.outputPath('videos');
    const context = await chromium.launchPersistentContext(profileDirectory, {
      args: [`--disable-extensions-except=${UNPACKED_EXTENSION_DIRECTORY}`, `--load-extension=${UNPACKED_EXTENSION_DIRECTORY}`],
      recordVideo: { dir: videoDirectory },
    });

    try {
      if (extensionProfile === 'configured') {
        await waitForStartupHeartbeat(context);
      }

      await use(context);
    } finally {
      const videos = context.pages().map((tab) => tab.video());
      await context.close();

      for (const video of videos) {
        if (video) {
          await testInfo.attach('video', { path: await video.path(), contentType: 'video/webm' });
        }
      }

      rmSync(videoDirectory, { recursive: true, force: true });

      if (extensionProfile !== 'setup') {
        rmSync(profileDirectory, { recursive: true, force: true });
      } else if (testInfo.status === 'passed') {
        markConfiguredProfileCurrent();
      }
    }
  },

  // A persistent context opens with one tab. Tests use that tab, so each test has one tab and one video.
  page: async ({ context }, use) => {
    const [firstPage] = context.pages();

    await use(firstPage ?? (await context.newPage()));
  },

  extensionId: async ({ context }, use) => {
    const [startedWorker] = context.serviceWorkers();
    const serviceWorker = startedWorker ?? (await context.waitForEvent('serviceworker'));

    await use(new URL(serviceWorker.url()).host);
  },
};
