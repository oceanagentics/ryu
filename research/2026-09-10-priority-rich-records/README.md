# Priority rich-record research

Nine priority systems remain in production. On 2026-09-11, the user removed OceanTeacher because its training platform does not fit the current system scope. Its research is retained for a future suitable record type; do not reimport it as a system.

The original ten-item batch was applied as rich records, with agent_researched review state in all six locales. See the historical [production application report](application-report.md) and [verified payload manifest](application-validation.json). Three subagents worked through the queue; the orchestrator reconciled shared identities and relationships and completed combined validation. Every main draft has six locales. Supporting endpoint drafts remain thin or stub.

Backlog: [Record Shape of CHM & top 10 Databases](https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit). The prerequisite task “Review rich record shape plan” completed before research started, and its current local contract was used.

## Original research queue

| Order | Record and research memo | Draft | Main edges | Metrics | Primary worker |
| --- | --- | --- | ---: | ---: | --- |
| 1 | [FishBase](fishbase/research.md) | [JSON](fishbase/draft.json) | 23 | 6 | worker_1 |
| 2 | [OBIS](obis/research.md) | [JSON](obis/draft.json) | 23 | 5 | worker_1 |
| 3 | [WoRMS](worms/research.md) | [JSON](worms/draft.json) | 19 | 4 | worker_2 |
| 4 | [European Nucleotide Archive / INSDC](ena/research.md) | [JSON](ena/draft.json) | 18 | 1 | worker_3 |
| 5 | [ISA DeepData](isa-deepdata/research.md) | [JSON](isa-deepdata/draft.json) | 22 | 3 | worker_2 |
| 6 | [Protected Planet / WDPCA](protected-planet/research.md) | [JSON](protected-planet/draft.json) | 12 | 2 | worker_3 |
| 7 | [Global Fishing Watch](global-fishing-watch/research.md) | [JSON](global-fishing-watch/draft.json) | 25 | 2 | worker_2 |
| 8 | [ABS Clearing-House](abs-clearing-house/research.md) | [JSON](abs-clearing-house/draft.json) | 9 | 3 | worker_3 |
| 9 | [OceanTeacher Global Academy](oceanteacher/research.md) | [JSON](oceanteacher/draft.json) | 12 | 1 | worker_1 |
| 10 | [ODIS](odis/research.md) | [JSON](odis/draft.json) | 18 | 4 | worker_3; closing reviews by workers 1 and 2 |

Main-edge counts overlap where a relationship appears in both endpoint drafts. The complete batch has **179 unique edges**, including 9 additional GFW operator relationships. There are **96 supporting identity drafts**, all absent from the initial canonical snapshot; these are relationship dependencies, not 96 additional completed rich-research jobs.

## Review and validation

Start with the [orchestration review](orchestration-review.md) for material corrections, evidence limits and release dependencies. Each folder contains its research memo, draft, primary-source evidence and historical validation results. The [ODIS source-inventory review](odis/registered-node-review.json) classifies all 65 catalogue rows, including two duplicate identities and 54 explicit expansion candidates.

The research-time [combined PostgreSQL validation](validation-postgres-batch.json) passed the current shape and quality rules, real SQL constraints, repository dry runs and complete supplied-field readback for **106 records**. All main-record references resolve, all six locales are present, and shared edge payloads have no conflicts. The rehearsal baseline contains canonical identities and kinds only; a future merge with concurrent production content requires fresh validation.

The pre-rollout [API validation](api-validation-batch.json) used fresh authenticated reads followed only by PUT validateOnly=true. All ten calls returned HTTP 200 / valid:false under the older deployed contract: retired access fields, relationship-review sections, localized standard labels, retired metric-gap fields, and missing endpoints. Exact issues and payload hashes are saved. Fresh reads confirmed preservation of all 25 existing incident-edge IDs and their source IDs across the five existing main records, plus existing node-source IDs. The other five main records were absent and were checked with create-only preconditions.

Root validation hashes use SHA-256 of JSON.stringify(parsed payload); some worker files instead hash the formatted file bytes. The application-validation.json manifest is the final evidence after rollout preservation and production application; earlier root/worker files are historical. canonical-index.json and canonical-final-reads.json are immutable research snapshots, not a registry or runtime source of truth.

## Production application

The user authorized application after the contract rollout. All ten main records and 96 supporting identities are now persisted; 157 new relationships were added, bringing the canonical graph to 238 records and 285 edges. All content writes passed live validation and readback. The full graph audit preserved original sources, relationships, routes and review history. Details and exact applied hashes are in the [application report](application-report.md).

The prerequisite production metrics/standards/access conversion and system-shape rollout completed in release 8aa2b8d6c8af. This application used the Record API and made no code, schema, vocabulary or deployment changes. New gallery screenshots remain local evidence, and no operational Ryu routes were approved by this research.

## Private research snapshots

Four authenticated endpoint snapshots containing reviewer metadata are retained locally under `.release/research-evidence/2026-09-10-priority-rich-records/`, outside Git and build uploads: `worms/endpoint-sealifebase.json`, `ena/endpoint-search.json`, `oceanteacher/dependency-identity.json`, and `oceanteacher/additional-dependency-identity.json`. Their relative paths below that archive are unchanged. Drafts, source evidence and validation reports remain in this batch.
