import { expect, test } from '@playwright/test';
import type { Download, Fixtures, Page, PlaywrightTestArgs } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const RECEIVING_SITE_URL = 'https://example.com/';
const LOG_FILE_NAME = 'prompt_security_extension_debug_logs.txt';
// The extension logs every message its background script receives. The popup sends the first one when it
// opens, which a log test does before anything else, and the second one when Download Logs is clicked.
const POPUP_OPENED_ENTRY = 'Received message getPopupSettings';
const DOWNLOAD_ENTRY = 'Received message saveLogs';

// Every log line carries a part of the API key, so the checks compare booleans and a failure does not print
// the file into the report.
export class LogsDownload {
  private readonly downloads: Download[] = [];

  constructor(private readonly receivingTab: Page) {
    receivingTab.on('download', (download) => this.downloads.push(download));
  }

  async verifyHoldsEarlierEntries(): Promise<void> {
    await test.step('Verify the downloaded log file holds an entry from before the download', async () => {
      const logs = await this.downloadedLogs();
      expect(logs.includes(POPUP_OPENED_ENTRY), 'the file holds the entry of the popup opening').toBe(true);
    });
  }

  async verifyHoldsNoEarlierEntries(): Promise<void> {
    await test.step('Verify the downloaded log file holds no entry from before the download', async () => {
      const logs = await this.downloadedLogs();
      expect(logs.includes(DOWNLOAD_ENTRY), 'the file holds the entry of the download').toBe(true);
      expect(logs.includes(POPUP_OPENED_ENTRY), 'the file holds the entry of the popup opening').toBe(false);
    });
  }

  private async downloadedLogs(): Promise<string> {
    const download = this.downloads[0] ?? (await this.receivingTab.waitForEvent('download'));
    expect(download.suggestedFilename()).toBe(LOG_FILE_NAME);

    return readFile(await download.path(), 'utf8');
  }
}

export type LogsDownloadFixtures = { logsDownload: LogsDownload };

export const logsDownloadFixtures: Fixtures<LogsDownloadFixtures, object, PlaywrightTestArgs> = {
  // The extension hands the logs to the tab in front, where the script it injects into web pages saves the
  // file. That script does not run on the popup's own page, so a second tab on an ordinary site receives the
  // logs. The tab is closed afterwards, which keeps the popup's video the only one of the test.
  logsDownload: async ({ context }, use) => {
    const receivingTab = await test.step(`Open ${RECEIVING_SITE_URL} in a second tab to receive the logs`, async () => {
      const tab = await context.newPage();
      await tab.goto(RECEIVING_SITE_URL);
      await tab.bringToFront();

      return tab;
    });

    await use(new LogsDownload(receivingTab));
    await receivingTab.close();
  },
};
