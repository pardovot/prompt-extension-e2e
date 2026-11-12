import { expect, test } from '@playwright/test';
import type { Locator, Request } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';

const CHAT_GPT_URL = 'https://chatgpt.com/';
const PROMPT_REQUEST_PATH = '/unauth-mweb/conversation/updates';
const PROMPT_FIELD = 'prompt';
const EXTENSION_PAGE_SCRIPT_PATH = 'bundle/script.bundle.js';

function sentPrompt(request: Request): string | null {
  return new URLSearchParams(request.postData() ?? '').get(PROMPT_FIELD);
}

function carriesPrompt(request: Request): boolean {
  return new URL(request.url()).pathname === PROMPT_REQUEST_PATH && Boolean(sentPrompt(request));
}

export class ChatGpt extends BasePage {
  private readonly promptInput: Locator;
  private readonly sendButton: Locator;
  private readonly promptRequests: Request[] = [];

  constructor(params: PageObjectParams) {
    super(params);
    this.promptInput = this.page.getByPlaceholder('Ask ChatGPT');
    this.sendButton = this.page.getByRole('button', { name: 'Send message' });
    this.page.on('request', (request) => {
      if (carriesPrompt(request)) {
        this.promptRequests.push(request);
      }
    });
  }

  // The extension inspects prompts through a script it adds to the page once the rule decision for the site
  // has arrived, which is later than the page's load event. A prompt sent before that goes out uninspected,
  // so the visit also waits for that script.
  override async visit(): Promise<void> {
    await Promise.all([this.waitForExtensionPageScript(), super.visit(CHAT_GPT_URL)]);
  }

  async sendTypedPrompt(prompt: string): Promise<void> {
    await test.step(`Type and send the prompt "${prompt}"`, async () => {
      await this.promptInput.pressSequentially(prompt);
      await this.sendButton.click();
    });
  }

  // The prompt is put on the browser's clipboard and pasted with the keyboard, so the page gets a real paste
  // event the way it does when a person pastes a copied secret.
  async sendPastedPrompt(prompt: string): Promise<void> {
    await test.step(`Paste and send the prompt "${prompt}"`, async () => {
      await this.page.context().grantPermissions(['clipboard-write']);
      await this.page.evaluate((text) => navigator.clipboard.writeText(text), prompt);
      await this.promptInput.click();
      await this.page.keyboard.press('ControlOrMeta+V');
      await this.sendButton.click();
    });
  }

  private async waitForExtensionPageScript(): Promise<void> {
    await test.step('Wait for the extension to add its script to the page', async () => {
      const pageScriptUrl = this.extensionUrl(EXTENSION_PAGE_SCRIPT_PATH);
      await this.page.waitForEvent('requestfinished', (request) => request.url() === pageScriptUrl);
    });
  }

  // The page shows the prompt as it was entered, so what reached ChatGPT is read from the request.
  async verifyPromptSentAs(prompt: string): Promise<void> {
    await test.step(`Verify ChatGPT was sent "${prompt}"`, async () => {
      const request = this.promptRequests[0] ?? (await this.page.waitForRequest(carriesPrompt));
      expect(sentPrompt(request)).toBe(prompt);
    });
  }
}
