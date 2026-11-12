import * as dotenv from 'dotenv';
import { z } from 'zod';
import { ENV_FILE } from 'src/utils/paths';

dotenv.config({ path: ENV_FILE, quiet: true });

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
  throw new Error(`Invalid environment. Copy .env.example to .env and fill it in.\n\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
