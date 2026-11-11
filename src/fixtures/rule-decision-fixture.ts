import { expect, test } from '@playwright/test';
import type { BrowserContext, Fixtures, PlaywrightTestArgs, Response } from '@playwright/test';
import { z } from 'zod';
import { EVALUATE_RULE_PATH, isBackendResponse } from 'src/extension/backend';

const ruleRequestSchema = z.object({ domain: z.string() });
const ruleResponseSchema = z.object({
  ruleInfo: z.object({
    action: z.enum(['Block', 'Protect', 'Detect', 'DontTrack']),
  }),
});

type RuleAction = z.infer<typeof ruleResponseSchema>['ruleInfo']['action'];

function isDecisionFor(response: Response, domain: string): boolean {
  return isBackendResponse(response, EVALUATE_RULE_PATH) && ruleRequestSchema.parse(response.request().postDataJSON()).domain === domain;
}

export class RuleDecision {
  private readonly responses: Response[] = [];

  constructor(private readonly context: BrowserContext) {
    context.on('response', (response) => {
      if (isBackendResponse(response, EVALUATE_RULE_PATH)) {
        this.responses.push(response);
      }
    });
  }

  async verifyBlocked(domain: string): Promise<void> {
    await test.step(`Verify the extension decided to block ${domain}`, async () => {
      expect(await this.firstAction(domain)).toBe('Block');
    });
  }

  async verifyAllowed(domain: string): Promise<void> {
    await test.step(`Verify the extension decided not to block ${domain}`, async () => {
      expect(await this.firstAction(domain)).not.toBe('Block');
    });
  }

  // The lookup and the wait start in the same turn, so a response cannot arrive between the two.
  private async firstAction(domain: string): Promise<RuleAction> {
    const response =
      this.responses.find((recorded) => isDecisionFor(recorded, domain)) ??
      (await this.context.waitForEvent('response', (incoming) => isDecisionFor(incoming, domain)));

    return ruleResponseSchema.parse(await response.json()).ruleInfo.action;
  }
}

export type RuleDecisionFixtures = { ruleDecision: RuleDecision };

export const ruleDecisionFixtures: Fixtures<RuleDecisionFixtures, object, PlaywrightTestArgs> = {
  ruleDecision: async ({ context }, use) => {
    await use(new RuleDecision(context));
  },
};
