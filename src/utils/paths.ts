import { resolve } from 'node:path';

// Written from the repository root, which is the working directory of every npm script.
export const ENV_FILE = resolve('.env');
export const EXTENSION_ARCHIVE = resolve(
  'extension/prompt-security-7.1.80.crx',
);
export const UNPACKED_EXTENSION_DIRECTORY = resolve('.extension-unpacked');
