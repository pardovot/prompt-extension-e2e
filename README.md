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

Node 22 or newer is needed.

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

The HTML report of each job is uploaded as an artifact, and the reports of the latest run on `master` are
published at https://pardovot.github.io/prompt-extension-e2e/. Before the upload the API key is replaced in
each report, traces included, by `***` and its last four characters.

The workflow needs one repository secret, `PROMPT_API_KEY`.

## How it is organised

- `src/policy/access-policy.ts` is the table of sites and what the policy expects for each. Covering
  another site is a new row, the specs loop over the table.
- Page objects live in `src/extension/` and `src/sites/`, hold every locator, and log each action and
  check as a step. Specs only call them.
- `src/fixtures/` launches Chromium with the extension, gives every test its own browser profile, and
  records the extension's calls to the backend.

`CLAUDE.md` holds the rules that changes to this repo follow.
