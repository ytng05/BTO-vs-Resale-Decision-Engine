# AI/LLM usage log (feeds the README declaration)

The briefing allows AI for lower-order tasks (search, layout ideas, debugging hints, boilerplate, test cases
and mock data) but not for core implementation or problem solving. Log every use so the README is accurate.
Expected values in engine tests must come from hand-worked examples, not from AI.

| Date | Who | Tool | What for | Files | Reviewed by |
|---|---|---|---|---|---|
| 2026-09-21 | (name) | Claude | Generated the initial repo scaffold: folder structure, Express/Vue boilerplate, config, stubs with contracts, mock data, test skeletons and docs. No business logic. | whole repo at first commit | |
| 2026-10-06 | (user-provided research; name not recorded) | Claude (research, as stated in supplied notes); GitHub Copilot (documentation formatting) | Organized supplied policy research into an unverified checklist; no policy values entered into the active ruleset and no eligibility logic produced. | docs/RULESET_RESEARCH.md | Pending source verification |
| 2026-10-06 | Har | Claude; GitHub Copilot | Claude used to check ruleset research values against official HDB/CPF/MOF/gov.sg sources; Har reviewed. Copilot used to update RULESET_RESEARCH.md. | docs/RULESET_RESEARCH.md | Har |
| 2026-10-06 | Har | GitHub Copilot | Transcribed user-verified loan research rows into the ruleset JSON; no policy values were independently researched or inferred. | docs/RULESET_RESEARCH.md; server/src/config/rulesets/ruleset.template.json | Har |
| 2026-10-06 | Har | GitHub Copilot | Added the verified TDSR scope and Seat 1 reminder to the research notes; no engine code changed. | docs/RULESET_RESEARCH.md | Har |
| 2026-10-06 | Har | GitHub Copilot | Copilot used to locate types, summarise docs, and scaffold grants.test.js (no expected values or logic). | server/src/engine/rules/grants.test.js; server/vitest.config.js; docs/AI_USAGE_LOG.md | Har |
| 2026-10-06 | Har | GitHub Copilot | With TA approval, implemented evaluateGrants and test expectations from the checked-in ruleset; documented optional Choice inputs. | server/src/engine/rules/grants.js; server/src/engine/rules/grants.test.js; server/src/engine/types.js; README.md | Har |
| 2026-10-06 | Har | GitHub Copilot | Transcribed the checked Family Grant income ceiling and PR+PR restriction into the research notes and ruleset; updated evaluator behavior and table-derived tests. | docs/RULESET_RESEARCH.md; server/src/config/rulesets/ruleset.template.json; server/src/engine/rules/grants.js; server/src/engine/rules/grants.test.js | Har |
| 2026-10-06 | Har | GitHub Copilot | Updated short-lease EHG behavior to retain the full tier amount with a pro-rating warning and added a regression test; formula remains TODO. | server/src/engine/rules/grants.js; server/src/engine/rules/grants.test.js | Har |
| 2026-10-06 | Har | GitHub Copilot | Added SC+SC 5-room, SC+PR 4-room, and SC+SC living-with-parents resale grant tests using the provided expected values. | server/src/engine/rules/grants.test.js | Har |
| 2026-10-07 | ytng05 | Claude | Fixed AppStepper.vue: added the mobile compact progress indicator (.stepper-mobile markup) that was styled but never rendered, causing the stepper to disappear below md with no replacement. | client/src/components/AppStepper.vue | |