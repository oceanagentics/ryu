# FishBase standards audit — 2026-09-10

Six approved standards are now assigned in the prepared graph batch and local preview, with cited scope descriptions in all six locales. Production application remains pending the typed-contract deployment and Google Cloud reauthentication.

## Approved assignments

| Standard | Verified FishBase use | Evidence |
| --- | --- | --- |
| `fao_fishing_areas` | The FAOAREAS table groups species occurrences by FAO major fishing areas. These are statistical boundaries; coverage may be incomplete. | [FishBase FAOAREAS manual](https://www.fishbase.se/manual/english/FishBaseThe_FAOAREAS_Table.htm) |
| `asfis` | The fisheries lookup supports ASFIS species entries and FAO alpha-code searches. | [FishBase ISSCAAP/ASFIS lookup](https://www.fishbase.se/report/isscaap/isscaapsearchmenu.php) |
| `isscaap` | The same lookup uses ISSCAAP species groups, with FishBase trophic and size information. FishBase cautions that the service may not meet FAO dissemination quality rules. | [FishBase ISSCAAP/ASFIS lookup](https://www.fishbase.se/report/isscaap/isscaapsearchmenu.php) |
| `darwin_core` | FishBase publishes an occurrence extract through GBIF Sweden as a Darwin Core Archive. The inspected release is dated 23 March 2023; this does not establish the schema of the current relational database or API. | [Publisher resource](https://www.gbif.se/ipt/resource?r=fishbase), [archive](https://www.gbif.se/ipt/archive.do?r=fishbase) |
| `eml` | Dataset metadata bundled with that archive uses EML 2.1.1 and the GBIF EML profile 1.2 schema reference. | [Archive, `eml.xml`](https://www.gbif.se/ipt/archive.do?r=fishbase) |
| `dublin_core` | The archive maps modification dates to `dcterms:modified`. This is a specific metadata-term use; date values need validation before downstream processing. | [Archive, `meta.xml` and `occurrence.txt`](https://www.gbif.se/ipt/archive.do?r=fishbase) |

## Direct artifact verification

The publisher resource names FishBase as publisher. The downloaded archive contains `occurrence.txt`, `meta.xml` and `eml.xml`; its EML package ID ends in `/v4.5`. The manifest declares a Darwin Core Occurrence core, with the Darwin Core text namespace and Dublin Core term URIs. The tabular file contains 731,043 occurrence rows.

Inspection of those rows found:

- `nomenclaturalCode` is `ICZN` in every row.
- `modified` is populated in 374,963 rows and empty in 356,080. Some dates have malformed time components, so this assignment documents term use rather than date conformance.
- `rightsHolder` is mapped to Dublin Core but empty throughout; it is not evidence of populated rights metadata.
- `geodeticDatum` is empty throughout. No WGS 84 assignment is justified by this archive.

Archive SHA-256: `5b7332e4c0904be11a1e032212338b3606c8869da5ae62068f78fcc187713072`. The archive was inspected locally; this research batch does not redistribute it.

## Missing vocabulary candidates

These IDs are proposals only. Adding a new canonical standard requires explicit approval under the [authoring rules](../../documentation/RICH_RESEARCH_RECORDS.md#approved-standards).

| Candidate | Finding and recommendation | Evidence |
| --- | --- | --- |
| `iucn_red_list` — IUCN Red List Categories and Criteria | Strongest proposed addition: FishBase uses an external conservation classification and assessment criteria. Preserve assessment date and applicable category-system version; a Red List release year is not a criteria version. FishBase-specific placeholders are not IUCN categories. | [STOCKS manual](https://www.fishbase.se/manual/FishBaseThe_STOCKS_Table.htm), [species-page assessment fields](https://www.fishbase.org/summary/Glyphis-gangeticus) |
| `iczn` — International Code of Zoological Nomenclature | Strong evidence: the archive declares the code in every row, and FishBase discusses ICZN rules. Decide whether scientific nomenclatural codes belong alongside data schemas and controlled vocabularies. A code does not prescribe one taxonomic opinion. | [Archive](https://www.gbif.se/ipt/archive.do?r=fishbase), [FishBase classification explanation](https://www.fishbase.se/Nomenclature/Classification_explanation.php) |
| `cites_appendices` — CITES appendix classification | FishBase exposes appendix values. Consider a narrowly named controlled classification if conservation/trade-status vocabularies belong in Standards; the treaty itself is too broad a label. | [Species-page CITES field](https://www.fishbase.org/summary/Glyphis-gangeticus) |
| `cms_appendices` — CMS appendix classification | FishBase exposes CMS Appendix I/II values. The same scope decision applies. This audit establishes the field's use, not a species' current legal status. | [Species-page CMS field](https://www.fishbase.se/summary/2588) |
| `un_m49` — UN M49 country/area codes | Unconfirmed. COUNTREF refers to UN statistical names and code numbers, but the exact mapping, historical codes and FishBase extensions need checking before assigning M49 or ISO 3166. | [COUNTREF manual](https://www.fishbase.se/manual/FishBaseThe_COUNTREF_Table.htm) |

Taxonomic backbones, internal FishBase identifiers and reuse licences do not become standards merely because FishBase references them. XML alone does not establish a metadata schema. No Darwin Core extensions, molecular standards or planned geographic classifications were inferred from related systems or outbound links.

## Scope of the correction

This replaces the earlier unresolved FishBase standards gap. It adds six existing vocabulary IDs and four owner-local sources; it retains the previously prepared move of licence/reference-number descriptions into cited profile prose. Other records, formats, data types, graph edges, routes, depth and review state are unchanged. The whole prepared batch now has 87 assignments across 42 systems, with 18 unresolved systems.
