import { expect, test } from '@playwright/test';
import { BasePage } from 'src/base-page';

export class GenAiSite extends BasePage {
  // A blocked site is replaced by the block page while it loads, and a site behind a bot challenge may never
  // finish loading, so the navigation waits only until the response starts to arrive.
  override async visit(url: string): Promise<void> {
    await super.visit(url, 'commit');
  }

  async verifyStillOn(url: string): Promise<void> {
    const { host } = new URL(url);

    await test.step(`Verify the tab is still on ${host}`, async () => {
      await expect(this.page).toHaveURL((current) => current.host === host);
    });
  }
}
