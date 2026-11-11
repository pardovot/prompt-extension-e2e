import AdmZip from 'adm-zip';
import { readFileSync, rmSync } from 'node:fs';
import {
  EXTENSION_ARCHIVE,
  UNPACKED_EXTENSION_DIRECTORY,
} from 'src/utils/paths';

// A CRX version 3 file is a zip behind a prefix: the magic, the format version and the length of a signed
// header, four bytes each, followed by that header. Other versions lay out the bytes after the version
// differently.
const CRX_MAGIC = 'Cr24';
const CRX_VERSION = 3;
const CRX_VERSION_OFFSET = 4;
const CRX_HEADER_LENGTH_OFFSET = 8;
const CRX_PREFIX_LENGTH = 12;

export function unpackExtension(): void {
  const archive = readFileSync(EXTENSION_ARCHIVE);
  const magic = archive.toString('latin1', 0, CRX_MAGIC.length);
  const version = archive.readUInt32LE(CRX_VERSION_OFFSET);

  if (magic !== CRX_MAGIC || version !== CRX_VERSION) {
    throw new Error(
      `${EXTENSION_ARCHIVE} is not a CRX version ${CRX_VERSION} file`,
    );
  }

  const zipStart =
    CRX_PREFIX_LENGTH + archive.readUInt32LE(CRX_HEADER_LENGTH_OFFSET);

  rmSync(UNPACKED_EXTENSION_DIRECTORY, { recursive: true, force: true });
  new AdmZip(archive.subarray(zipStart)).extractAllTo(
    UNPACKED_EXTENSION_DIRECTORY,
  );
}
