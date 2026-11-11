import AdmZip from 'adm-zip';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VISIBLE_KEY_CHARACTERS = 4;
// Latin1 maps every byte to one character and back, so binary content survives being handled as text.
const BYTE_ENCODING = 'latin1';
// Matches the base64 text of the zip that the HTML report embeds in its index.html as a data URI.
const EMBEDDED_ZIP = /(?<=data:application\/zip;base64,)[A-Za-z0-9+/=]+/g;

const [reportDirectory] = process.argv.slice(2);
const apiKey = process.env.PROMPT_API_KEY;

if (!reportDirectory || !apiKey) {
  throw new Error('Usage: node scripts/redact-report.mts <report directory>, with PROMPT_API_KEY set');
}

// The end of the key stays readable, so a reader of a report can tell which key the run used.
const redactedKey = `***${apiKey.slice(-VISIBLE_KEY_CHARACTERS)}`;

const redactText = (text: string): string => text.replaceAll(apiKey, redactedKey);

// Only the entries that hold the key are rewritten, because adm-zip writes a wrong checksum for an empty
// entry whose data is set, and a trace has empty entries.
const redactZip = (content: Buffer): Buffer => {
  const zip = new AdmZip(content);
  const entriesWithKey = zip.getEntries().filter((entry) => entry.getData().toString(BYTE_ENCODING).includes(apiKey));

  for (const entry of entriesWithKey) {
    entry.setData(Buffer.from(redactText(entry.getData().toString(BYTE_ENCODING)), BYTE_ENCODING));
  }

  return entriesWithKey.length > 0 ? zip.toBuffer() : content;
};

const redactEmbeddedZips = (text: string): string =>
  text.replace(EMBEDDED_ZIP, (base64) => redactZip(Buffer.from(base64, 'base64')).toString('base64'));

const redactFile = (file: string, content: Buffer): Buffer => {
  if (file.endsWith('.zip')) {
    return redactZip(content);
  }

  const text = redactText(content.toString(BYTE_ENCODING));

  return Buffer.from(file.endsWith('.html') ? redactEmbeddedZips(text) : text, BYTE_ENCODING);
};

const reportFiles = readdirSync(reportDirectory, { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));

for (const file of reportFiles) {
  const content = readFileSync(file);
  const redacted = redactFile(file, content);

  if (!redacted.equals(content)) {
    writeFileSync(file, redacted);
  }
}

console.log(`API key redacted in ${reportDirectory}`);
