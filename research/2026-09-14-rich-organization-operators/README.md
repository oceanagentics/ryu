# Rich organization operator pilot

This batch applies the proposed organization record shape to the nine unique organizations that operate the current rich systems. FishBase has two operators, so the nine systems yield ten `operates` relationships but nine organization records.

## Coverage

| Organization | Established | Scale fact | Office location |
| --- | --- | --- | --- |
| CBD Secretariat | Explicit research gap | About 110 staff; undated and includes short-term staff and consultants | Montreal, Canada |
| International Seabed Authority | 1994-11-16 | 171 member countries; observed 2026-02-06 | Kingston, Jamaica |
| EMBL-EBI | 1994 | 646 FTE; 2025 | Hinxton, United Kingdom |
| Q-quatics | 2017-02-09 | 25 regular staff; 2023 | Los Baños, Philippines |
| Swedish Museum of Natural History | 1819 | 283 employees; 2025-12-31 | Stockholm, Sweden |
| Global Fishing Watch, Inc. | 2017-06 | Nearly 90 staff; recorded as an explicitly qualified approximation for 2023 | Washington, D.C., United States |
| IOC-UNESCO IODE | 1961 | Explicit research gap; official centre and associate-unit counts were not collapsed into a membership metric | Ostend, Belgium |
| UNEP-WCMC | 2000 current partnership | More than 200 experts; recorded as an explicitly qualified lower bound | Cambridge, United Kingdom |
| Flanders Marine Institute | 1999-10-01 | 150 employees; 2022 | Ostend, Belgium |

Every record includes six complete localizations (`ar`, `zh`, `en`, `fr`, `ru`, `es`), a localized mission, sourced neutral facts, localized office names, and source descriptions carrying qualifications for dates and scale figures.

## Relationship audit

The records preserve 37 canonical incident relationships. Research added one material relationship: the Government of Flanders funds the Flanders Marine Institute through an annual Flemish Region grant. No relationship was inferred from shared addresses, membership, or technical association. One pre-existing EMBL governance citation was completed across all six source-title locales.

## Artifacts and validation

- `canonical-operators.json`: read-only canonical snapshots used as the starting point.
- `drafts/*.json`: individual Record API content payloads.
- `batch.json`: the nine current-contract payloads as one reviewable batch.
- `validation-local.json`: contract validation produced while generating the drafts.
- `validation-postgres.json`: validation after each payload was dry-run, applied, read back, and revalidated through `PostgresGraphRepository` against the current PostgreSQL schema in PGlite.
- `preview-local.ts`: fetches the production public graph, applies the country and organization batches in PGlite, converts edges to the migration 018 contract, validates every rich record, and writes `client/public/bootstrap.preview.json` without writing to production.

Both validation reports contain nine valid records, zero issues, and complete source resolution. The PostgreSQL pass exposed a missing-parentheses bug in the SQL `researchGaps` shape check; the schema, migration, and regression test now cover that case.

The batch was applied to production after the coordinated node/edge schema
release with `scripts/releases/2026-09-14-rich-nodes.mjs`. The runner dry-ran
every payload before any write, used fresh record timestamps, verified readback,
and recorded an `agent_researched` event for all six localizations.

Generate and serve the read-only static preview from the main checkout:

```sh
node --import tsx research/2026-09-14-rich-organization-operators/preview-local.ts
VITE_APP_MODE=public VITE_STATIC_PREVIEW=true VITE_BOOTSTRAP_PATH=/bootstrap.preview.json npm --workspace client run dev
```
