import { env } from 'src/env';
import { test } from 'src/fixtures';

const WRONG_API_KEY = '00000000-0000-0000-0000-000000000000';

test.beforeEach(async ({ ExtensionPopup }) => {
  await ExtensionPopup.visit();
});

test.describe('on a new profile', () => {
  test.use({ extensionProfile: 'empty' });

  test('the popup saves the valid API key and the extension reaches the backend', async ({ ExtensionPopup }) => {
    await ExtensionPopup.save(env.PROMPT_API_DOMAIN, env.PROMPT_API_KEY);
    await ExtensionPopup.verifyConnected();
  });

  test('the popup reports a failed connection for a wrong API key', async ({ ExtensionPopup }) => {
    await ExtensionPopup.save(env.PROMPT_API_DOMAIN, WRONG_API_KEY);
    await ExtensionPopup.verifyConnectionFailed();
  });
});

test('the popup of a configured extension shows the saved API domain', async ({ ExtensionPopup }) => {
  await ExtensionPopup.verifyConfigured(env.PROMPT_API_DOMAIN);
});

test('the popup confirms that the logs were cleared', async ({ ExtensionPopup }) => {
  await ExtensionPopup.clearLogs();
  await ExtensionPopup.verifyLogsCleared();
});
