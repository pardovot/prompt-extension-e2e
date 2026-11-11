import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { env } from 'src/env';
import { CONFIGURED_PROFILE_FINGERPRINT, EXTENSION_ARCHIVE, UNPACKED_EXTENSION_DIRECTORY } from 'src/utils/paths';

// A hash of everything the saved profile depends on. The unpacked folder is part of it because Chromium
// derives the extension id from that path and keys the extension's storage by the id.
function currentFingerprint(): string {
  return createHash('sha256')
    .update(readFileSync(EXTENSION_ARCHIVE))
    .update(UNPACKED_EXTENSION_DIRECTORY)
    .update(env.PROMPT_API_DOMAIN)
    .update(env.PROMPT_API_KEY)
    .digest('hex');
}

export function isConfiguredProfileCurrent(): boolean {
  return existsSync(CONFIGURED_PROFILE_FINGERPRINT) && readFileSync(CONFIGURED_PROFILE_FINGERPRINT, 'utf8') === currentFingerprint();
}

export function markConfiguredProfileCurrent(): void {
  writeFileSync(CONFIGURED_PROFILE_FINGERPRINT, currentFingerprint());
}
