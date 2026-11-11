import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';

const BLOCK_PAGE_PATH = 'html/pageOverlay.html';

export class BlockPage extends BasePage {
  private readonly title: Locator;
  private readonly message: Locator;

  constructor(params: PageObjectParams) {
    super(params);
    this.title = this.page.locator('#title-text');
    this.message = this.page.locator('#message-title');
  }

  async verifyDomainBlocked(domain: string): Promise<void> {
    await test.step(`Verify the tab shows the block page for ${domain}`, async () => {
      await expect(this.page).toHaveURL((url) => url.href.startsWith(this.extensionUrl(BLOCK_PAGE_PATH)));
      await expect(this.title).toHaveText('Access Denied');
      await expect(this.message).toHaveText(`The domain ${domain} was blocked by your administrator`);
    });
  }
}
