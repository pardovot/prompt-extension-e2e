import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';

const BLOCK_PAGE_PATH = 'html/pageOverlay.html';

export class BlockPage extends BasePage {
  private readonly title: Locator;

  constructor(params: PageObjectParams) {
    super(params);
    this.title = this.page.getByText('Access Denied', { exact: true });
  }

  async verifyDomainBlocked(domain: string): Promise<void> {
    await test.step(`Verify the tab shows the block page for ${domain}`, async () => {
      const message = this.page.getByText(`The domain ${domain} was blocked by your administrator`, { exact: true });

      await expect(this.page).toHaveURL((url) => url.href.startsWith(this.extensionUrl(BLOCK_PAGE_PATH)));
      await expect(this.title).toBeVisible();
      await expect(message).toBeVisible();
    });
  }
}
