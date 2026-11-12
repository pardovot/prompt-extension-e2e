# prompt-extension-e2e

End to end tests for the Prompt Security browser extension. The suite loads the extension into Chromium with
Playwright, configures it with an API domain and key, and checks that it allows or blocks GenAI sites the
way the admin policy says.

## What is tested

| Test | Kind |
|---|---|
| ChatGPT is allowed | positive, against the live policy |
| Gemini is blocked | negative, with the backend's decision overridden, see [The Gemini policy](#the-gemini-policy) |
| The popup saves the valid API key and the extension reaches the backend | positive |
| The popup reports a failed connection for a wrong API key | negative |
| The popup of a configured extension shows the saved API domain | positive |
| The popup downloads the extension logs | positive |
| The popup clears the extension logs | positive |
| A typed card number and secret are redacted before the prompt reaches ChatGPT | positive |
| A pasted card number and secret are redacted before the prompt reaches ChatGPT | positive |
| A prompt with harmless numbers reaches ChatGPT unchanged | negative |

A site test relies on two things, the decision the extension got from the backend for that domain, and
what the tab shows afterwards. An allowed site has to get a decision other than `Block` and stay in the
tab, a blocked site has to get `Block` and end up on the extension's "Access Denied" page naming the
domain. Waiting for the decision first is what keeps "the site was not blocked" from passing just because
the extension had not acted yet.

## The Gemini policy

The assignment describes a policy that allows chatgpt.com and blocks other GenAI apps such as
gemini.google.com. With the API key I received, the backend answers `Protect` for Gemini, the same as for
ChatGPT, so the extension lets the site load and nothing is blocked.

To still cover the blocked path, the Gemini test overrides one field. The extension's request goes to the
backend as usual, and the `action` in the answer is replaced with `Block` before the extension reads it.
The test then checks that the extension sends the tab to its block page. This shows that the extension
enforces a block decision, it does not show that the policy blocks Gemini.

The override is one line, [`src/policy/blocked-sites.spec.ts:6`](src/policy/blocked-sites.spec.ts#L6):

```ts
await ruleDecision.overrideDecision(site.domain, 'Block');
```

Once the policy blocks Gemini, deleting that line turns the same test into a check of the live policy, and
I'm happy to make that change as soon as it does.

## Running locally

Node 22.18 or newer is needed.

```
npm ci
npx playwright install --no-shell chromium
```

On Linux add `--with-deps` to the second command. Then copy `.env.example` to `.env`, set
`PROMPT_API_KEY` to the key from the assignment email, and run:

```
npm test
```

The first run configures the extension once through its popup and saves the browser profile under
`.profiles/`. Later runs start each test from a copy of that profile, and configure again only if the
extension build, the API domain or the key changed. Tests run in parallel and headless, each in its own
browser. Only the Chromium that Playwright installs is used, never an installed Chrome or a personal
profile.

| Command | What it does |
|---|---|
| `npm test` | runs the suite |
| `npm run test:headed` | runs it with visible browser windows |
| `npx playwright show-report` | opens the HTML report of the last run, with a screenshot and a video per test and a trace for each failed one |
| `npm run lint`, `npm run typecheck`, `npm run format:check` | static checks, the same ones CI runs |

## CI

`.github/workflows/e2e.yml` runs on every push to `master`, on pull requests and on demand, on Ubuntu, Windows
and macOS. Each job installs the dependencies and the browser, runs the static checks and the tests, and
prints every test and its result to its log.

The HTML report of each job is uploaded as an artifact. For a run on `master` the three reports are also
published to GitHub Pages under the id of the run, and the run's summary and the commit's checks link to
them. The reports of the run `github.com/pardovot/prompt-extension-e2e/actions/runs/<run id>` are at
`pardovot.github.io/prompt-extension-e2e/<run id>/ubuntu/`, `/windows/` and `/macos/`. Before the upload
the API key is replaced in each report, traces included, by `***` and its last four characters.

The workflow needs one repository secret, `PROMPT_API_KEY`.

## How it is organised

- `src/policy/access-policy.ts` is the table of sites and what the policy expects for each. Covering
  another site is a new row, the specs loop over the table.
- Page objects live in `src/extension/` and `src/sites/`, hold every locator, and log each action and
  check as a step. Specs only call them.
- `src/fixtures/` launches Chromium with the extension, gives every test its own browser profile, and
  records the extension's calls to the backend.

`CLAUDE.md` holds the rules that changes to this repo follow.

## Design decisions

- The extension is configured once through its popup and the browser profile is saved. Every test starts
  from its own copy of that profile, the way a web suite reuses a signed in session, because Playwright's
  `storageState` does not cover extension storage.
- Every test has its own browser and its own profile, so tests share nothing and run in parallel in any
  order.
- Tests wait on what the extension does, never for a fixed time: its startup heartbeat before a site is
  opened, the script it adds to a page before a prompt is sent, the popup's inputs before its buttons are
  clicked. Each of these waits is there because acting sooner was measured to lose the action.
- What reached ChatGPT is read from the request the page sends, because the page keeps showing the prompt
  as it was entered.
- The browser is the Chromium that Playwright installs. Branded Chrome no longer loads an extension from a
  folder, this build does, and its headless mode runs extensions, so CI needs no display. Headless Chromium
  calls itself `HeadlessChrome` in its user agent, which ChatGPT answers with a bot check, so the config
  sets the user agent of a headed Chrome of the same version.
- Download Logs is tested with a second tab, because the extension hands the logs to the tab in front and
  the script that saves them does not run on the popup's own page.

## Known limits

- The backend does not block Gemini for this API key. The blocked path is covered with the decision
  overridden, and the stated policy for Gemini is not verified.
- The allowed site test runs against the live policy, so a failure there can mean a changed policy as well
  as a broken extension. The two signals tell them apart: a changed policy shows as an unexpected decision,
  a broken extension as a correct decision that was not enforced.
- No test signs in to a site. Prompt inspection is covered on ChatGPT's logged out page only, and file
  uploads and the site's answers are not exercised.
- The dialog the extension shows after a redaction is not asserted. The checks are on what the backend
  answered and on what was sent.
- Only the Chrome for Testing build that Playwright pins is covered, with the committed extension build
  loaded from a folder. The popup is opened in a tab, not from the toolbar.
- The tests depend on live sites, which can change their pages or challenge automated browsers.
