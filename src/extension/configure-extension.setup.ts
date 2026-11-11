import { env } from 'src/env';
import { test } from 'src/fixtures';

test.use({ extensionProfile: 'setup' });

test('configure the extension through the popup', async ({ ExtensionPopup }) => {
  await ExtensionPopup.visit();
  await ExtensionPopup.save(env.PROMPT_API_DOMAIN, env.PROMPT_API_KEY);
  await ExtensionPopup.verifyConnected();
});
