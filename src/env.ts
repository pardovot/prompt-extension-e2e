import * as dotenv from 'dotenv';
import { join } from 'node:path';
import { z } from 'zod';

dotenv.config({ path: join(__dirname, '..', '.env'), quiet: true });

const envSchema = z.object({
  CI: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  PROMPT_API_DOMAIN: z.string().min(1),
  PROMPT_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment. Copy .env.example to .env and fill it in.\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
