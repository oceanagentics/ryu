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

An authenticated read of the production Record API on 2026-09-14 returned nine
systems with `recordDepth=rich`. Eight had empty galleries and were demoted to
`thin` through depth-only Record API patches after successful validation dry
runs:

| System ID | Gallery items | Current depth | Required follow-up |
| --- | ---: | --- | --- |
| `abs-clearing-house` | 0 | `thin` | Capture a representative ABS record or data-content view. |
| `deepdata` | 0 | `thin` | Capture a representative DeepData record or data-content view. |
| `ena` | 0 | `thin` | Capture a representative ENA record or data-content view. |
| `global-fishing-watch` | 0 | `thin` | Capture a representative data or analysis view. |
| `platform-obis` | 0 | `thin` | Capture a representative OBIS record or data-content view. |
| `odis` | 0 | `thin` | Capture a representative ODIS record or data-content view. |
| `protected-planet` | 0 | `thin` | Capture a representative Protected Planet record or data-content view. |
| `worms` | 0 | `thin` | Capture a representative WoRMS record or data-content view. |

`fishbase` has four production gallery items. Its species record, search fields,
and downloadable-product views satisfy the requirement; its homepage view is
supplemental rather than the qualifying evidence. The canonical fixture keeps
only the three substantive slides so new authors do not copy a generic homepage
as the exemplar.

The demotions changed only `recordDepth`: all record content, localizations,
relationships, routes, and review states were preserved. No images were
fabricated. FishBase remains `rich`; the eight systems must remain `thin` until
their images are researched and captured according to the authoring guide,
translated consistently across all six locales, dry-run with `validateOnly=true`,
and applied with a fresh record timestamp. If access is blocked, keep the system
thin rather than substituting a weak image.
