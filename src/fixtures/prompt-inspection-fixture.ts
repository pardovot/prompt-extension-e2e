import { expect, test } from '@playwright/test';
import type { BrowserContext, Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { z } from 'zod';
import { BackendResponses, PROTECT_PATH } from 'src/extension/backend';

const protectResponseSchema = z.looseObject({
  result: z.looseObject({
    action: z.string(),
    prompt: z.looseObject({ modified_text: z.string().nullable() }),
  }),
});

export class PromptInspection {
  private readonly inspections: BackendResponses;

  constructor(context: BrowserContext) {
    this.inspections = new BackendResponses(context, PROTECT_PATH);
  }

  async verifyModifiedTo(prompt: string): Promise<void> {
    await test.step(`Verify the backend told the extension to change the prompt to "${prompt}"`, async () => {
      const inspection = await this.inspections.firstResponse();
      const { result } = protectResponseSchema.parse(await inspection.json());
      expect(result.action).toBe('modify');
      expect(result.prompt.modified_text).toBe(prompt);
    });
  }

  async verifyNotModified(): Promise<void> {
    await test.step('Verify the backend inspected the prompt and asked for no change', async () => {
      const inspection = await this.inspections.firstResponse();
      const { result } = protectResponseSchema.parse(await inspection.json());
      expect(result.action).toBe('log');
      expect(result.prompt.modified_text).toBeNull();
    });
  }
}

export type PromptInspectionFixtures = { promptInspection: PromptInspection };

export const promptInspectionFixtures: Fixtures<PromptInspectionFixtures, object, PlaywrightTestArgs> = {
  promptInspection: async ({ context }, use) => {
    await use(new PromptInspection(context));
  },
};
