import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { BasePage, type PageObjectParams } from 'src/base-page';

// Matches the extension's overlay page opened as a block page: its path, then `type=blockPage` in the query.
const BLOCK_PAGE_URL = /\/html\/pageOverlay\.html\?.*type=blockPage/;

export class BlockPage extends BasePage {
  private readonly title: Locator;

  constructor(params: PageObjectParams) {
    super(params);
    this.title = this.page.getByText('Access Denied', { exact: true });
  }

  async verifyDomainBlocked(domain: string): Promise<void> {
    await test.step(`Verify the tab shows the block page for ${domain}`, async () => {
      const message = this.page.getByText(`The domain ${domain} was blocked by your administrator`, { exact: true });

      // A pattern, not a function: given a function, `toHaveURL` waits on navigations and fails at once when
      // the extension's redirect aborts one the site still has in flight.
      await expect(this.page).toHaveURL(BLOCK_PAGE_URL);
      await expect(this.title).toBeVisible();
      await expect(message).toBeVisible();
    });
  }
}
