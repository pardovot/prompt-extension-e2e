import type { BrowserContext, Response } from '@playwright/test';
import { env } from 'src/env';

export const HEARTBEAT_PATH = '/api/extension/heartbeat';
export const EVALUATE_RULE_PATH = '/api/employee/evaluate-rule';

export function isBackendResponse(response: Response, path: string): boolean {
  const url = new URL(response.url());

  return url.host === env.PROMPT_API_DOMAIN && url.pathname === path;
}

export class BackendResponses {
  private readonly recorded: Response[] = [];

  constructor(
    private readonly context: BrowserContext,
    private readonly path: string,
  ) {
    context.on('response', (response) => {
      if (isBackendResponse(response, path)) {
        this.recorded.push(response);
      }
    });
  }

  // The lookup and the wait start in the same turn, so a response cannot arrive between the two.
  async firstResponse(matches: (response: Response) => boolean = () => true): Promise<Response> {
    return (
      this.recorded.find(matches) ??
      (await this.context.waitForEvent('response', (response) => isBackendResponse(response, this.path) && matches(response)))
    );
  }
}
