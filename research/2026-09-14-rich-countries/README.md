# Rich country backfill — 2026-09-14

## Scope

This batch upgrades the four country nodes that existed in the canonical graph on
2026-09-14: Canada (`can`), Germany (`deu`), Japan (`jpn`), and the United States
(`usa`). Each payload supplies a canonical government URL, a concise profile,
aliases, and BBNJ Agreement participation in all six supported locales.

The BBNJ Agreement is the initial treaty scope because it directly concerns the
conservation and sustainable use of marine biological diversity beyond national
jurisdiction. Treaty status is based on the United Nations depositary record, not
on press statements or domestic legislative milestones.

## Treaty findings

| Record | Status on 2026-09-14 | Signature | Consent deposited | Effective | Formal focal office |
| --- | --- | --- | --- | --- | --- |
| Canada | Signatory, not Party | 2024-03-04 | — | — | — |
| Germany | Signatory, not Party | 2023-09-20 | — | — | — |
| Japan | Party | — | Accession, 2025-12-12 | 2026-01-17 | Law of the Sea Division, International Legal Affairs Bureau, Ministry of Foreign Affairs |
| United States | Signatory, not Party | 2023-09-20 | — | — | — |

Germany's Bundestag approved joining the Agreement in February 2026, but the UN
depositary did not list a deposited German instrument on the research date. The
record therefore does not conflate domestic approval with international consent
to be bound.

Japan's depositary entry includes a declaration concerning the non-retroactive
application of Part II to marine genetic resources collected, and related digital
sequence information generated, before entry into force for Japan. The record
stores Japan's stable responsible office rather than a named official or email
address that may change.

## Relationship review

All 17 incident edges were reviewed against their existing official citations:

- Canada: 2 (`governs`, `member_of`)
- Germany: 4 (`funds`, `member_of`)
- Japan: 3 (`governs`, `funds`)
- United States: 8 (`governs`, `member_of`)

No edge was added or changed. Signing or becoming a Party to a treaty does not by
itself establish one of Ryu's graph relationships. No BBNJ organization node is
needed for the participation facts represented here, and the status of each
country remains on its owning country record.

## Sources

- UN depositary: <https://treaties.un.org/doc/Publication/MTDSG/Volume%20II/Chapter%20XXI/XXI-10.en.xml>
- UN BBNJ focal points for formal communications: <https://www.un.org/bbnjagreement/en/focal-points-formal-communications>
- German Federal Government, Bundestag approval: <https://www.bundesregierung.de/breg-de/bundesregierung/bundeskanzleramt/un-hochseeschutzabkommen-2397340>
- Government of Canada: <https://www.canada.ca/en.html>
- German Federal Government: <https://www.bundesregierung.de/breg-en>
- Government of Japan: <https://www.japan.go.jp/>
- United States Government: <https://www.usa.gov/>

The UN focal-point directory was readable through the public web surface during
research but returned HTTP 403 to the command-line URL checker. Its content was
therefore verified through the official indexed page, and the canonical UN URL is
retained as the source and focal-point directory link.

## Validation and application

Each payload passed the local country record validator with zero issues and
complete source resolution. All four then passed `PUT /api/records/:id` with
`validateOnly=true` before any write was made.

The validated payloads were applied to the canonical Record API with a fresh
`x-ryu-record-updated-at` precondition and re-read immediately afterward:

| Record | Applied `recordUpdatedAt` | Depth | Locales | Edges | Routes | Review state |
| --- | --- | --- | --- | --- | --- | --- |
| `can` | `2026-09-14T14:29:03.702Z` | rich | 6 | 2 | 0 | agent_researched |
| `deu` | `2026-09-14T14:29:04.052Z` | rich | 6 | 4 | 0 | agent_researched |
| `jpn` | `2026-09-14T14:29:04.437Z` | rich | 6 | 3 | 0 | agent_researched |
| `usa` | `2026-09-14T14:29:04.805Z` | rich | 6 | 8 | 0 | agent_researched |

No localization was marked `human_reviewed` by this research batch.

The currently deployed compatibility serializer also returns the legacy empty
system collections (`disciplines`, `gallery`, `data.descriptors`, `access`, and
`metrics`) on country aggregates. They contain no content, and they are
deliberately absent from these clean country payloads. The country-contract
release and migration own removal of those response defaults; this research
write did not broaden into a code or schema deployment.
