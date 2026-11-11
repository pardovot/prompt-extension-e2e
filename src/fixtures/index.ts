import { test as base } from '@playwright/test';
import { extensionContextFixtures, type ExtensionContextFixtures } from 'src/fixtures/extension-context-fixture';
import { ruleDecisionFixtures, type RuleDecisionFixtures } from 'src/fixtures/rule-decision-fixture';

export const test = base.extend<ExtensionContextFixtures & RuleDecisionFixtures>({
  ...extensionContextFixtures,
  ...ruleDecisionFixtures,
});
export { expect } from '@playwright/test';
