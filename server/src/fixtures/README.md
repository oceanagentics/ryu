# Canonical system record example

`rich-record.json` freezes the full FishBase content in the approved system shape.
It includes six localizations, 20 node-owned sources, 16 descriptors (including
six standards), eight Read/Write access paths, five metrics, four gallery items,
nine relationships with their own sources, and no operational routes.

The content comes from the prepared 2026-09-10 metrics/standards/access release
at commit `3b103c189498c757948f98f99d32632c6fe9d845`. That preparation fresh-read
the canonical Record API, converted legacy metrics and merged the reviewed
standards and access batches. Production FishBase was still `thin` with legacy
fields at the review read (`recordUpdatedAt: 2026-09-10T20:02:33.089Z`). The
prepared record also preserves `thin`; this fixture sets `rich` to exercise the
full contract and includes empty `researchGaps` objects to illustrate omission.
These example choices do not promote or certify the production record.

API response fields, timestamps and review metadata are excluded. Content,
source dates, values, IDs and translations are preserved from the preparation.
The operator edge is ordered first for readability; array order alone does not
establish graph semantics. Dates and counts remain historical assertions. This
is not a fresh factual or URL review, and translations are not certified as
human-reviewed.

Tests seed the connected endpoint nodes in isolated PostgreSQL, then exercise
this payload through transactional PUT/PATCH and the SQL structural guards.
Invalid variants come from this same example. Tests also cover allowed gaps,
unfinished thin records, and synthetic active routes; FishBase's empty routes
do not remove routes from the supported aggregate contract.

Copy the format, never apply this fixture over production FishBase or reuse its
facts and IDs for another system. Postgres remains the canonical graph. Update
the fixture deliberately with contract changes; never fetch live data in tests.

See [the authoring guide](../../../documentation/RICH_RESEARCH_RECORDS.md) for
the exact field contract, research requirements and review workflow.
