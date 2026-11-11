import { rmSync } from 'node:fs';
import { unpackExtension } from 'src/extension/unpack-extension';
import { TEST_PROFILES_DIRECTORY } from 'src/utils/paths';

export default function globalSetup(): void {
  unpackExtension();
  // An interrupted run leaves its profile copies behind, and each one holds the API key.
  rmSync(TEST_PROFILES_DIRECTORY, { recursive: true, force: true });
}
