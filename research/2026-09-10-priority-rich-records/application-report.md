# Priority rich records — production application

Completed on 2026-09-11 UTC after the user authorized application. All ten priority systems are now rich in the canonical Cloud SQL graph, with six complete localizations each, agent_researched review state in all 60 localizations, and complete source-reference coverage. The batch used the deployed record contract from release 8aa2b8d6c8af.

## Applied result

- Created 101 records: 96 supporting identities and the five previously missing main systems. Updated the five existing main systems.
- Applied 179 unique researched relationships: 157 new edges and 22 pre-existing edges retained or enriched. The complete graph grew from 137 to 238 records and from 128 to 285 edges.
- Supporting records remain thin or stub; they are not additional completed rich profiles.
- All original node/edge source IDs, all 128 original edge IDs, all routes and all 677 existing localization review histories were preserved. Thirty existing main-localization states were advanced from needs_revision to agent_researched; thirty newly created main localizations already held that state. No human_reviewed state was assigned.

| Record | Depth | Review | Incident edges | Resolved references |
| --- | --- | --- | ---: | ---: |
| fishbase | rich | agent_researched × 6 | 23 | 50/50 |
| platform-obis | rich | agent_researched × 6 | 23 | 49/49 |
| worms | rich | agent_researched × 6 | 19 | 38/38 |
| ena | rich | agent_researched × 6 | 18 | 41/41 |
| deepdata | rich | agent_researched × 6 | 22 | 78/78 |
| protected-planet | rich | agent_researched × 6 | 12 | 38/38 |
| global-fishing-watch | rich | agent_researched × 6 | 25 | 48/48 |
| abs-clearing-house | rich | agent_researched × 6 | 9 | 36/36 |
| oceanteacher | rich | agent_researched × 6 | 12 | 32/32 |
| odis | rich | agent_researched × 6 | 18 | 69/69 |

Incident counts overlap across endpoints. Source-reference counts are owner-scoped coverage checks, not counts of unique external publications or proof of claim accuracy.

## Preservation and verification

Fresh reads after the contract rollout identified 22 added source entries across OBIS, WoRMS, ENA and ODIS. They were unioned into the reviewed drafts. ENA also retained three cited procedural instructions in all six locales: upload reads before interactive submission, use CLI test mode, and distinguish API test/production services. Existing relationship IDs and researched edge payloads stayed consistent.

The full current graph was rehearsed with the real PostgreSQL schema and repository. Missing identities were created first; the five new main profiles temporarily remained thin until their relationships were applied. Every content write passed live validateOnly validation with a fresh create-only or timestamp precondition, then passed immediate readback. Twelve completion updates added the two supporting relationship sets and ten rich profiles. All 113 content writes succeeded.

Final fresh API reads verified every content field across all 238 records against the expected merged graph, and every resulting record passed local aggregate quality validation. Empty API display defaults on sparse stubs were normalized for comparison, and edge/route collections were matched by ID independently of database collation; ordered content arrays remained exact. Review history was checked separately. The final verification time is 2026-09-11T02:14:11.315Z.

[Application validation and payload hashes](application-validation.json) are the current evidence. Earlier per-worker reports, api-validation-batch.json and validation-postgres-batch.json preserve the research-time state and may have older payload hashes. Four main draft hashes changed during preservation; they now match the applied payloads.

Full authenticated snapshots, preconditions, dry-run responses, apply/readback logs and review metadata are retained privately under .release/priority-rich-records-apply-2026-09-11/ and excluded from Git/build uploads. Production writes used only the canonical Record API. This application required no code, vocabulary, schema or deployment changes.

## Remaining research limits

The documented evidence gaps remain visible. New screenshots are local research assets, and the batch approves no operational Ryu routes. ODIS’s 54 additional catalogue candidates remain an explicit expansion list. These limits do not represent unfinished application of the reviewed batch.
