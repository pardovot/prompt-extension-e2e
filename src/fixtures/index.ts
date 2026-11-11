import { test as base } from '@playwright/test';
import { extensionContextFixtures, type ExtensionContextFixtures } from 'src/fixtures/extension-context-fixture';
import { pageObjectFixtures, type PageObjectFixtures } from 'src/fixtures/page-objects-fixture';
import { promptInspectionFixtures, type PromptInspectionFixtures } from 'src/fixtures/prompt-inspection-fixture';
import { ruleDecisionFixtures, type RuleDecisionFixtures } from 'src/fixtures/rule-decision-fixture';

type SuiteFixtures = ExtensionContextFixtures & RuleDecisionFixtures & PromptInspectionFixtures & PageObjectFixtures;

export const test = base.extend<SuiteFixtures>({
  ...extensionContextFixtures,
  ...ruleDecisionFixtures,
  ...promptInspectionFixtures,
  ...pageObjectFixtures,
});
export { expect } from '@playwright/test';
