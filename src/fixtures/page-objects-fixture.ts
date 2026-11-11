import type { Fixtures, PlaywrightTestArgs } from '@playwright/test';
import type { BasePage, PageObjectParams } from 'src/base-page';
import type { ExtensionContextFixtures } from 'src/fixtures/extension-context-fixture';
import * as pageObjects from 'src/index';

export type PageObjectFixtures = {
  [Name in keyof typeof pageObjects]: InstanceType<(typeof pageObjects)[Name]>;
};

export const pageObjectFixtures = Object.fromEntries(
  Object.entries(pageObjects).map(([name, PageObject]) => [
    name,
    async ({ page, extensionId }: PageObjectParams, use: (pageObject: BasePage) => Promise<void>) => {
      await use(new PageObject({ page, extensionId }));
    },
  ]),
) as Fixtures<PageObjectFixtures, object, PlaywrightTestArgs & ExtensionContextFixtures>;
