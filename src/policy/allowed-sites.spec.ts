import { test } from 'src/fixtures';
import { allowedSites } from 'src/policy/access-policy';

for (const site of allowedSites) {
  test(`${site.name} is allowed`, async ({ GenAiSite, ruleDecision }) => {
    await GenAiSite.visit(site.url);
    await ruleDecision.verifyAllowed(site.domain);
    await GenAiSite.verifyStillOn(site.url);
  });
}
