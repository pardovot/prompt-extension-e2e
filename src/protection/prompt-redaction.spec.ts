import { test } from 'src/fixtures';

// Published dummy values: the standard Visa test card and the example secret key of the AWS documentation.
const SENSITIVE_PROMPT = 'My card is 4111 1111 1111 1111 and my AWS secret is wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const REDACTED_PROMPT = 'My card is [REDACTED_CREDIT_CARD_1] and my AWS secret is [REDACTED_AWS_SECRET_KEY_CREDENTIALS_1]';
// The numbers are short because the backend redacts a longer run of digits as a phone number.
const HARMLESS_PROMPT = 'Is 2026 a leap year, and how many days are there in 12 weeks?';

// These tests visit ChatGPT, which the allowed site test already does, because prompts can only be sent from
// the site's own prompt box.
test.beforeEach(async ({ ChatGpt }) => {
  await ChatGpt.visit();
});

test('a typed card number and secret are redacted before the prompt reaches ChatGPT', async ({ ChatGpt, promptInspection }) => {
  await ChatGpt.sendTypedPrompt(SENSITIVE_PROMPT);
  await promptInspection.verifyModifiedTo(REDACTED_PROMPT);
  await ChatGpt.verifyPromptSentAs(REDACTED_PROMPT);
});

test('a pasted card number and secret are redacted before the prompt reaches ChatGPT', async ({ ChatGpt, promptInspection }) => {
  await ChatGpt.sendPastedPrompt(SENSITIVE_PROMPT);
  await promptInspection.verifyModifiedTo(REDACTED_PROMPT);
  await ChatGpt.verifyPromptSentAs(REDACTED_PROMPT);
});

test('a prompt with harmless numbers reaches ChatGPT unchanged', async ({ ChatGpt, promptInspection }) => {
  await ChatGpt.sendTypedPrompt(HARMLESS_PROMPT);
  await promptInspection.verifyNotModified();
  await ChatGpt.verifyPromptSentAs(HARMLESS_PROMPT);
});
