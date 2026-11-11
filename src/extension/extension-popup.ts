import { expect, test } from '@playwright/test';
import type { Dialog, Locator } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';
import { BackendResponses, HEARTBEAT_PATH } from 'src/extension/backend';

const POPUP_PATH = 'html/popup.html';

export class ExtensionPopup extends BasePage {
  private readonly apiDomainInput: Locator;
  private readonly apiKeyInput: Locator;
  private readonly saveButton: Locator;
  private readonly downloadLogsButton: Locator;
  private readonly clearLogsButton: Locator;
  private readonly logsClearedMessage: Locator;
  private readonly heartbeats: BackendResponses;
  private readonly alerts: Dialog[] = [];

  constructor(params: PageObjectParams) {
    super(params);
    // The popup's labels are not tied to its inputs, and the inputs have no placeholder or test id, so the
    // id is the only stable handle on them.
    this.apiDomainInput = this.page.locator('#apiDomain');
    this.apiKeyInput = this.page.locator('#apiKey');
    this.saveButton = this.page.getByRole('button', { name: 'Save' });
    this.downloadLogsButton = this.page.getByRole('button', { name: 'Download Logs' });
    this.clearLogsButton = this.page.getByRole('button', { name: 'Clear Logs' });
    this.logsClearedMessage = this.page.getByText('Logs were cleared', { exact: true });
    this.heartbeats = new BackendResponses(this.page.context(), HEARTBEAT_PATH);
    // Playwright dismisses a dialog that has no listener, so alerts are kept for the verification to read.
    this.page.on('dialog', (dialog) => this.alerts.push(dialog));
  }

  // The popup keeps starting up after its load event: it shows its inputs, and a few milliseconds later its
  // buttons get their click handlers, 15 ms after load when measured here and about 100 ms on a processor
  // slowed six times. A click before that does nothing, so the visit waits for both inputs to show.
  override async visit(): Promise<void> {
    await super.visit(this.extensionUrl(POPUP_PATH));

    await test.step('Wait for the popup to finish starting up', async () => {
      await expect(this.apiDomainInput).toBeVisible();
      await expect(this.apiKeyInput).toBeVisible();
    });
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

  async verifyConfigured(apiDomain: string): Promise<void> {
    await test.step(`Verify the popup shows the saved API domain ${apiDomain}`, async () => {
      await expect(this.apiDomainInput).toHaveValue(apiDomain);
      await expect(this.saveButton).toBeHidden();
    });
  }

  async downloadLogs(): Promise<void> {
    await test.step('Download the extension logs', async () => {
      await this.downloadLogsButton.click();
    });
  }

  async clearLogs(): Promise<void> {
    await test.step('Clear the extension logs', async () => {
      await this.clearLogsButton.click();
    });
  }

  async verifyLogsCleared(): Promise<void> {
    await test.step('Verify the popup confirms the logs were cleared', async () => {
      await expect(this.logsClearedMessage).toBeVisible();
    });
  }
}
