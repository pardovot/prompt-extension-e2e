import { expect, test } from '@playwright/test';
import type { BrowserContext, Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { z } from 'zod';
import { BackendResponses, EVALUATE_RULE_PATH } from 'src/extension/backend';

const ruleRequestSchema = z.object({ domain: z.string() });
const ruleResponseSchema = z.looseObject({
  ruleInfo: z.looseObject({
    action: z.enum(['Block', 'Protect', 'Detect', 'DontTrack']),
  }),
});

type RuleAction = z.infer<typeof ruleResponseSchema>['ruleInfo']['action'];

export class RuleDecision {
  private readonly evaluations: BackendResponses;

  constructor(private readonly context: BrowserContext) {
    this.evaluations = new BackendResponses(context, EVALUATE_RULE_PATH);
  }

  // The request still goes to the backend, and only the action in its answer is replaced, so the extension
  // gets a response that is real in every other field.
  async overrideDecision(domain: string, action: RuleAction): Promise<void> {
    await test.step(`Override the backend's decision for ${domain} with ${action}`, async () => {
      await this.context.route(`**${EVALUATE_RULE_PATH}`, async (route) => {
        if (ruleRequestSchema.parse(route.request().postDataJSON()).domain !== domain) {
          await route.continue();
          return;
        }

        const response = await route.fetch();
        const body = ruleResponseSchema.parse(await response.json());

        await route.fulfill({ response, json: { ...body, ruleInfo: { ...body.ruleInfo, action } } });
      });
    });
  }

  async verifyBlocked(domain: string): Promise<void> {
    await test.step(`Verify the extension decided to block ${domain}`, async () => {
      const action = await this.firstAction(domain);
      expect(action).toBe('Block');
    });
  }

  async verifyAllowed(domain: string): Promise<void> {
    await test.step(`Verify the extension decided not to block ${domain}`, async () => {
      const action = await this.firstAction(domain);
      expect(action).not.toBe('Block');
    });
  }

  private async firstAction(domain: string): Promise<RuleAction> {
    const response = await this.evaluations.firstResponse(
      (evaluation) => ruleRequestSchema.parse(evaluation.request().postDataJSON()).domain === domain,
    );

    return ruleResponseSchema.parse(await response.json()).ruleInfo.action;
  }
}

export type RuleDecisionFixtures = { ruleDecision: RuleDecision };

export const ruleDecisionFixtures: Fixtures<RuleDecisionFixtures, object, PlaywrightTestArgs> = {
  ruleDecision: async ({ context }, use) => {
    await use(new RuleDecision(context));
  },
};
