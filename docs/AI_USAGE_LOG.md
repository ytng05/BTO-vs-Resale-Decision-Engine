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
