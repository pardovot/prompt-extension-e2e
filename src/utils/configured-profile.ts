import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { env } from 'src/env';
import { HEARTBEAT_PATH } from 'src/extension/backend';
import { CONFIGURED_PROFILE_RECORD, EXTENSION_ARCHIVE, UNPACKED_EXTENSION_DIRECTORY } from 'src/utils/paths';

// The timestamps the extension sends with its heartbeat for the configuration it holds.
const configurationVersionSchema = z.object({
  lastConfigurationTimestamp: z.string(),
  configTimestamps: z.record(z.string(), z.string()),
});

export type ConfigurationVersion = z.infer<typeof configurationVersionSchema>;

const savedProfileRecordSchema = z.object({
  fingerprint: z.string(),
  configurationVersion: configurationVersionSchema,
});

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

// The same question the extension asks with its heartbeat. The backend's answer is empty when it has nothing
// newer than the given timestamps, and otherwise names what the extension should fetch.
async function isNewestConfiguration(configurationVersion: ConfigurationVersion): Promise<boolean> {
  const answer = await fetch(`https://${env.PROMPT_API_DOMAIN}${HEARTBEAT_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'APP-ID': env.PROMPT_API_KEY },
    body: JSON.stringify({ ...configurationVersion, getConfig: true, getConfigurationByTimestamp: true, getConfigurationFromCache: true }),
  });

  return answer.ok && (await answer.text()) === '';
}

// An extension that holds an older configuration fetches the newer one at startup, while its test is already
// running, so a saved profile is reused only as long as the backend has nothing newer.
export async function isConfiguredProfileCurrent(): Promise<boolean> {
  if (!existsSync(CONFIGURED_PROFILE_RECORD)) {
    return false;
  }

  const record = savedProfileRecordSchema.parse(JSON.parse(readFileSync(CONFIGURED_PROFILE_RECORD, 'utf8')));

  return record.fingerprint === currentFingerprint() && (await isNewestConfiguration(record.configurationVersion));
}

export function markConfiguredProfileCurrent(configurationVersion: ConfigurationVersion): void {
  writeFileSync(CONFIGURED_PROFILE_RECORD, JSON.stringify({ fingerprint: currentFingerprint(), configurationVersion }));
}
