import type { Response } from '@playwright/test';
import { env } from 'src/env';

export const HEARTBEAT_PATH = '/api/extension/heartbeat';
export const EVALUATE_RULE_PATH = '/api/employee/evaluate-rule';

export function isBackendResponse(response: Response, path: string): boolean {
  const url = new URL(response.url());

  return url.host === env.PROMPT_API_DOMAIN && url.pathname === path;
}
