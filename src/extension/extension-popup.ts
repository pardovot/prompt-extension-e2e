import { expect, test } from '@playwright/test';
import type { Dialog, Locator } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';
import { BackendResponses, HEARTBEAT_PATH } from 'src/extension/backend';

const POPUP_PATH = 'html/popup.html';

export class ExtensionPopup extends BasePage {
  private readonly apiDomainInput: Locator;
  private readonly apiKeyInput: Locator;
  private readonly saveButton: Locator;
  private readonly heartbeats: BackendResponses;
  private readonly alerts: Dialog[] = [];

  constructor(params: PageObjectParams) {
    super(params);
    this.apiDomainInput = this.page.locator('#apiDomain');
    this.apiKeyInput = this.page.locator('#apiKey');
    this.saveButton = this.page.locator('#saveButton');
    this.heartbeats = new BackendResponses(this.page.context(), HEARTBEAT_PATH);
    // Playwright dismisses a dialog that has no listener, so alerts are kept for the verification to read.
    this.page.on('dialog', (dialog) => this.alerts.push(dialog));
  }

  // The popup's stylesheet hides both inputs until its script has attached their listeners, so the page has
  // to be loaded before a fill can rely on the inputs being visible.
  override async visit(): Promise<void> {
    await super.visit(this.extensionUrl(POPUP_PATH));
  }

  async save(apiDomain: string, apiKey: string): Promise<void> {
    await test.step(`Save API domain ${apiDomain} and an API key`, async () => {
      await this.apiDomainInput.fill(apiDomain);
      await this.apiKeyInput.fill(apiKey);
      await this.saveButton.click();
    });
  }

  // The popup hides Save on the click and shows it again only when the connection fails, so the button
  // says nothing until the backend has answered.
  async verifyConnected(): Promise<void> {
    await test.step('Verify the extension reached the backend', async () => {
      const heartbeat = await this.heartbeats.firstResponse();
      expect(heartbeat.status()).toBe(200);
      await expect(this.saveButton).toBeHidden();
    });
  }

  async verifyConnectionFailed(): Promise<void> {
    await test.step('Verify the popup reports a failed connection', async () => {
      const heartbeat = await this.heartbeats.firstResponse();
      expect(heartbeat.status()).toBe(401);
      const alert = this.alerts[0] ?? (await this.page.waitForEvent('dialog'));
      expect(alert.message()).toBe('Failed to connect to server');
      await alert.accept();
      await expect(this.saveButton).toBeVisible();
    });
  }
}
