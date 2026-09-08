# Rich record example

`rich-record.json` is a compact, content-only FishBase example derived from an
authenticated `GET /api/records/fishbase?include=localizations,sources,edges,routes`
on 2026-09-07. The canonical response had `recordUpdatedAt`:
`2026-09-04T02:18:45.664Z`.

The example retains the canonical six-language profile, three representative
source-backed descriptors, two access paths, two data metrics, one usage metric,
one gallery item, and the operator edge. Six shared sources cover these sections.
Dates/counts are preserved historical assertions; this fixture does not claim a
fresh factual or URL review. No machine route was present in the response.

Fixture-only additions: explicit profile/edge source references, localized
descriptor labels, and six-language source titles/notes. These translations are
agent-authored examples, not human-approved source publications. No review or
audit fields are supplied. The existing gallery files are reused.

The integration test seeds the required `q-quatics` organization in its isolated
PostgreSQL instance, then writes and reads this payload through the repository.
Invalid cases are derived from the same fixture, avoiding competing examples.

Do not import this abridged example over the production FishBase record. Postgres
remains canonical. Change this fixture deliberately when the record contract
changes; do not automatically refresh it from the live database during tests.

See `documentation/RICH_RESEARCH_RECORDS.md` for the complete authoring standard.
