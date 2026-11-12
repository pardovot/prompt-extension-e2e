# prompt-extension-e2e

Playwright and TypeScript suite that loads the Prompt Security browser extension into Chromium and checks
that it allows or blocks GenAI sites according to the access policy its administrator set. The design
decisions and their reasons are in the README. This file is the set of rules for any change in the repo,
AI assisted or not.

## Always

- Specs never use the browser directly. They call page objects and the helper fixtures in `src/fixtures/`:
  no `page.goto`, `page.getBy*` or `page.locator` in a `.spec.ts` file. A missing page object is created
  before the spec that needs it.
- Page objects live in `src/<domain>/<name>.ts`, extend `BasePage`, and are re-exported through
  `src/<domain>/index.ts` and `src/index.ts`, which is what turns each one into a fixture.
- Wrap every action and verification in `test.step('intent', ...)` inside the page object method, not in
  the spec. Steps are what the HTML report and a failure message show, so step names should read as a
  test log.
- Page objects import `test` and `expect` from `@playwright/test`, not from `src/fixtures`, which keeps
  `src/fixtures` out of an import cycle.
- Locators follow the order Playwright recommends: `getByRole` for anything a user interacts with,
  `getByText` for text that is only read, `getByLabel` or `getByPlaceholder` for form fields, then
  `getByTestId`. A CSS or id selector is the last resort and gets one inline comment saying why none of the
  others fit.
- Static locators are `readonly` fields assigned in the constructor. A locator whose selector depends on a
  method argument is a `const` inside that method.
- One owner per locator. Before adding one, grep the other page objects for the same target and call the
  owner's method instead of redefining it.
- Site expectations come from the policy table in `src/policy/`. Adding a site to the suite is a data
  change, not a new spec.
- Code in `src/` reads its configuration from `src/env.ts`, which validates `process.env` with zod, never
  from `process.env` itself.

## Never

- No page object instantiated inside another, and no reaching one page object through another. Share
  behaviour with inheritance, and destructure each fixture in the spec.
- No `try/catch` around `expect`. A test asserts one outcome.
- No branching on runtime DOM state (`if (await x.isVisible())`, `count() > 0`, `.catch(() => false)`) to
  choose an action or to skip an assertion. Branching on a method parameter is fine.
- No OR regex in an expected value (`/blocked|denied/`). Assert the one specific text.
- No fixed sleeps. Wait on a locator, a response or a URL.
- No assertion that something is absent before the extension has had its chance to act. Wait for the
  extension's rule decision for that navigation first, then assert the tab is still on the site.
- No installed Chrome or personal profile: no `channel: 'chrome'`, no `executablePath`. Only Playwright's
  bundled Chromium, and only through the extension context fixture, which is the single place that calls
  `launchPersistentContext`.
- No hardcoded extension id or `chrome-extension://` URL. The id is read from the service worker by the
  fixture.
- No direct use of extension internals (`chrome.storage`, service worker `evaluate`) in specs or page
  objects. That belongs in fixtures.
- No changing of the extension's network traffic. The one exception is `ruleDecision.overrideDecision`,
  which exists because the backend blocks no site for the API key in use, and it replaces a single field
  of a real answer.
- No signing in to third party sites and no submitting prompts unless the test is about prompt handling.
  The live sites are not ours, keep traffic minimal.
- No API key in code, logs, step names, screenshots of the popup, or committed files. It comes from `.env`
  locally and a GitHub Actions secret in CI. Its first 8 characters count as the key too, because the
  extension prints them as `APP_ID` in its own logs.
- No platform specific code in the suite: build paths with `node:path` and use npm scripts instead of
  shell scripts, so the same `npm test` runs on Linux, Windows and macOS.

## Avoid, and justify in one inline comment when used

- `test.slow()` and `test.setTimeout()`.
- Per call timeouts under 15 seconds, which tend to flake on CI, and over 60 seconds.
- `.or()` locators, unless the page really has two markup variants.
- More than one retry, and a second test that visits a live site another test already covers. Tests run
  in parallel, so each extra visit to a site can land at the same moment as the first.

## Before calling a change done

- `npm run lint`, `npm run typecheck` and `npm run format:check` pass.
- The affected specs pass locally, headless, with the same command CI runs.
- Walk the Never list against the diff.
