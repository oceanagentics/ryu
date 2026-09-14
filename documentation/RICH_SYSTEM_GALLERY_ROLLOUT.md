# Rich system gallery rollout

Rich system records now require at least one useful gallery item showing a
representative record or data content. The runtime reports the issue at
`record.properties.gallery` with this message:

> at least one useful gallery item showing a representative record or data
> content is required

This is a system-only research-depth rule. It does not add gallery fields to the
country or organization contracts. The approved neutral and localized gallery
objects are unchanged, so no SQL shape migration or vocabulary release is
required. PostgreSQL continues to guard the stored gallery structure; the Record
API validates rich completeness on the resulting aggregate.

The existing shape is sufficient for the requirement. A neutral gallery item
identifies the image or embed and its source. Its six localized entries use the
existing title and caption to say which representative record, data product,
structure, or retrievable data types are visible. The validator enforces at
least one item, asset and source validity, matching IDs, and complete localized
titles and captions. Human review remains responsible for confirming that the
image actually shows the described content; the implementation does not use
brittle keyword or filename checks.

## Canonical audit

An authenticated read of the production Record API on 2026-09-14 initially
returned nine rich systems. Eight had empty galleries and were demoted to `thin`
through depth-only Record API patches. Representative record or data views were
then captured from their cited public sources:

| System ID | Captured view | Source ID | Final depth |
| --- | --- | --- | --- |
| `abs-clearing-house` | Published South African IRCC record | `abs-ircc-example` | `rich` |
| `deepdata` | Dataset inventory | `collection` | `rich` |
| `ena` | Tara project record | `ena-tara` | `rich` |
| `global-fishing-watch` | Fishing-hours dataset record | `ee` | `rich` |
| `platform-obis` | OBIS dataset record | `obis-dfo-dataset` | `rich` |
| `odis` | Catalogue record | `node-gbif` | `rich` |
| `protected-planet` | Bonaire protected-site record | `pp-bonaire` | `rich` |
| `worms` | *Solea solea* taxon record | `worms-taxon-solea-solea` | `rich` |

The high-resolution and thumbnail PNGs were published in compatibility release
`49b5bd2` without bundling the pending node-kind contract migrations. All 16
public image URLs returned HTTP 200 with `image/png`. Each record patch added one
neutral gallery item and matching title, caption, and alt text in all six
locales; WoRMS also gained the owner-local source used by its new item.

All eight patches passed `validateOnly=true`, used fresh
`x-ryu-record-updated-at` preconditions, and were read back as rich with their
unrelated content unchanged. FishBase remained rich with its four production
gallery items. The production-compatible enforcement release `ecf5f8f` then
made an empty gallery invalid for rich systems. Final inventory returned exactly
nine rich systems, and a live validation-only removal test was rejected at
`record.properties.gallery` with the expected requirement message.
