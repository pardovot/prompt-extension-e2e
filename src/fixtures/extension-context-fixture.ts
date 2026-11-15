import { chromium, test } from '@playwright/test';
import type { BrowserContext, Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { z } from 'zod';
import {
  BackendResponses,
  CONFIGURATION_PATH,
  HEARTBEAT_PATH,
  isBackendResponse,
  isStaticResponse,
  POPUP_ASSETS_PATH,
} from 'src/extension/backend';
import { isConfiguredProfileCurrent, markConfiguredProfileCurrent, type ConfigurationVersion } from 'src/utils/configured-profile';
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

const configurationSchema = z.looseObject({ configTimestamps: z.record(z.string(), z.string()) });
const popupAssetsSchema = z.looseObject({ timestamp: z.string() });

// After its first heartbeat the extension fetches its configuration, its list of native apps and its popup
// assets, in that order, and keeps them in the profile. Waiting for the last of them means every copy of the
// profile starts with the configuration in place. The timestamps are the ones the extension sends with its
// later heartbeats: one per part of the configuration, and the newest of them for the configuration as a whole.
async function loadedConfigurationVersion(configurations: BackendResponses, popupAssets: BackendResponses): Promise<ConfigurationVersion> {
  const configuration = await configurations.firstResponse();
  const assets = await popupAssets.firstResponse();
  const { configTimestamps } = configurationSchema.parse(await configuration.json());
  const { timestamp } = popupAssetsSchema.parse(await assets.json());

  return {
    lastConfigurationTimestamp: Object.values(configTimestamps).reduce((newest, time) =>
      Date.parse(time) > Date.parse(newest) ? time : newest,
    ),
    configTimestamps: { ...configTimestamps, popupAssets: timestamp },
  };
}

export const extensionContextFixtures: Fixtures<ExtensionContextFixtures, object, PlaywrightTestArgs> = {
  extensionProfile: ['configured', { option: true }],

  context: async ({ extensionProfile }, use, testInfo) => {
    testInfo.skip(
      extensionProfile === 'setup' && (await isConfiguredProfileCurrent()),
      'The saved profile matches the extension build, API domain and key, and the backend has no newer configuration',
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

    const configurations = new BackendResponses(context, CONFIGURATION_PATH, isStaticResponse);
    const popupAssets = new BackendResponses(context, POPUP_ASSETS_PATH, isStaticResponse);
    let savedConfigurationVersion: ConfigurationVersion | undefined;

    try {
      if (extensionProfile === 'configured') {
        await waitForStartupHeartbeat(context);
      }

      await use(context);

      if (extensionProfile === 'setup' && testInfo.status === 'passed') {
        savedConfigurationVersion = await test.step('Wait for the extension to load its first configuration', () =>
          loadedConfigurationVersion(configurations, popupAssets));
      }
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
      } else if (savedConfigurationVersion) {
        markConfiguredProfileCurrent(savedConfigurationVersion);
      }
    }
  },

  // A persistent context opens with one tab. Tests work in that tab, so the video of a test shows it.
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
