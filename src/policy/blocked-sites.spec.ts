import { test } from 'src/fixtures';
import { blockedSites } from 'src/policy/access-policy';

for (const site of blockedSites) {
  test(`${site.name} is blocked`, async ({ GenAiSite, ruleDecision, BlockPage }) => {
    await GenAiSite.visit(site.url);
    await ruleDecision.verifyBlocked(site.domain);
    await BlockPage.verifyDomainBlocked(site.domain);
  });
}
