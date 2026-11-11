import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

export type PageObjectParams = { page: Page; extensionId: string };

export abstract class BasePage {
  protected readonly page: Page;
  private readonly extensionId: string;

  constructor({ page, extensionId }: PageObjectParams) {
    this.page = page;
    this.extensionId = extensionId;
  }

  async visit(url: string, waitUntil: 'load' | 'commit' = 'load'): Promise<void> {
    await test.step(`Open ${url}`, async () => {
      await this.page.goto(url, { waitUntil });
    });
  }

  protected extensionUrl(path: string): string {
    return `chrome-extension://${this.extensionId}/${path}`;
  }
}
