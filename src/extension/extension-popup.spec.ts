import { env } from 'src/env';
import { test } from 'src/fixtures';

const WRONG_API_KEY = '00000000-0000-0000-0000-000000000000';

test.use({ extensionProfile: 'empty' });

test.beforeEach(async ({ ExtensionPopup }) => {
  await ExtensionPopup.visit();
});

test('the popup saves the valid API key and the extension reaches the backend', async ({ ExtensionPopup }) => {
  await ExtensionPopup.save(env.PROMPT_API_DOMAIN, env.PROMPT_API_KEY);
  await ExtensionPopup.verifyConnected();
});

test('the popup reports a failed connection for a wrong API key', async ({ ExtensionPopup }) => {
  await ExtensionPopup.save(env.PROMPT_API_DOMAIN, WRONG_API_KEY);
  await ExtensionPopup.verifyConnectionFailed();
});
