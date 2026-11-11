import { test as base } from '@playwright/test';
import { extensionContextFixtures, type ExtensionContextFixtures } from 'src/fixtures/extension-context-fixture';
import { pageObjectFixtures, type PageObjectFixtures } from 'src/fixtures/page-objects-fixture';
import { ruleDecisionFixtures, type RuleDecisionFixtures } from 'src/fixtures/rule-decision-fixture';

export const test = base.extend<ExtensionContextFixtures & RuleDecisionFixtures & PageObjectFixtures>({
  ...extensionContextFixtures,
  ...ruleDecisionFixtures,
  ...pageObjectFixtures,
});
export { expect } from '@playwright/test';
