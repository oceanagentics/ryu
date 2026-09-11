# OceanTeacher rich-record research — 10 September 2026

**Deferred:** Removed from production on 2026-09-11 at the user's direction because the training platform does not fit the current system scope. Do not reimport it as a system; reconsider only when a suitable record type exists. Research remains here, with a private pre-deletion record snapshot and verified deletion receipt under `.release/oceanteacher-removal-2026-09-11/`. The removal deleted its six localizations and twelve incident relationships; all other records and unrelated relationships remained.

Production status: applied and verified on 2026-09-11 UTC. See the [application report](../application-report.md). The research-time notes and validation outcomes below are retained as history.

`draft.json` proposes a new `oceanteacher` system: six languages, 5 data descriptors, 6 access paths, 1 measurement and 12 cited edges. All six relationship types were investigated. `endpoint-drafts.json` contains seven minimal, separately cited dependencies. No production content or review state was changed. No code, schema, vocabulary, reusable scripts or public gallery assets were changed.

## Identity and scope

Fresh canonical searches for OceanTeacher/OTGA and exact GETs found no existing record. A fresh GET immediately before the create-only dry run remained HTTP404. The canonical index was reviewed for alternate identities; unrelated search hits were not merged. There are no stored incident edges or localizations to preserve. `identity-and-endpoints.json`, `dependency-identity.json`, `additional-dependency-identity.json` and `canonical-before-validation.json` preserve the checks.

The current [IODE capacity-development page](https://iode.org/actions/capacity-development/), updated June 2026, calls OTGA an IOC programme delivered through regional and specialized centres, with classroom, blended, facilitated online and self-paced teaching. Its secretariat and shared Moodle platform are hosted by the IOC Project Office for IODE in Oostende. English, French, Portuguese and Spanish are teaching languages; the record’s six translation locales do not imply six teaching languages.

The [2026 course-management guidelines](https://oceanexpert.org/downloadFile/61311), particularly pp.8–10, assign management, platform hosting, technical support, administration and quality assurance to the secretariat. The [fifth Steering Group final report](https://oceanexpert.org/downloadFile/61264), published January 2026 for the November 2025 meeting, records IODE workplan/budget oversight and anticipated IOC reform. An anticipated transition is not represented as an accomplished institutional change. IOC Circular 3067 of 3 February 2026, [official copy circulated by Uruguay](https://www.anep.edu.uy/sites/default/files/2026-04/Convocatoria.pdf), sets formal nomination, review and five-year renewal arrangements for training centres; completion of the 2026 renewal round was not established.

The backlog conflated training infrastructure with the IOC CHM-TMT and BBNJ Clearing-House. The catalogue does contain the actual 2026 course **Using Science, Knowledge & Tools to operationalise the BBNJ Agreement** (1283). That establishes a training topic, not identity as the Clearing-House, a live matching function or a technical feed. Those claims were removed from the candidate.

## Measurements and exact reporting scopes

| Fact | Scope and treatment |
| --- | --- |
| More than 250 courses; more than 15,000 learners; 130 IOC Member States | [FUST OTGA2](https://fust.iode.org/en/otga2) reporting for 2015–2025. Programme delivery totals, retained as sourced profile prose. They are not current database holdings. |
| 17 regional/specialized centres | Published FUST and current IODE network description. A count of institutions, not data records or contributors. |
| More than 650 facilitators | SG-V report §2.1.1: experts, lecturers and support staff contributing to course development/delivery in **2024–10 November 2025**. Approved `contributor_count`, value 650 with explicit “over 650” lower-bound description; observedAt 2025-11-10, period null because the interval crosses years. Unique-person deduplication is unspecified. |
| 112 courses; more than 9,100 registered learners; average 40% completion | Same report and interval, a different scope from the FUST multi-year totals. Sourced memo context only; no session-count substitution. |
| Participants based in 138 IOC Member States | Same 2024–10 November 2025 report; this differs from FUST’s 130-state historical figure. No attempt to reconcile the programme’s different reports into one supposedly current total. |
| More than 17,000 LMS users; 12,245 enrolled in at least one course | SG-V report’s November 2025 snapshot, not sessions or downloads. |
| About 3,400 learning hours | Same report; no approved equivalent metric key. |
| Stored course/resource inventory and storage bytes | No verified complete inventory or byte count found. Public category/search counts are query slices, and courses delivered are events rather than a holdings census. |

No session, download or citation count was verified. The six locales state Data and Usage gaps rather than inventing measurements. The €/$ programme budgets are kept on scoped funding edges, not misrepresented as system measurements.

## Access, data and standards

The [2026 catalogue](https://classroom.oceanteacher.org/course/index.php?categoryid=198&perpage=all) was read anonymously and provides extensive course previews, languages, organizers and conditions. Direct opening of MEDIN course 1313 redirected to the [login page](https://classroom.oceanteacher.org/login/index.php). Root independently confirmed the same distinction in the in-app browser: the annual catalogue is public, while tested course/topic entry points require login and provide no guest button. Old OceanTeacher credentials are deactivated; learners use OceanExpert accounts activated by an administrator, which may take several working days. Individual courses may require selection, institutional affiliation or an enrolment key. Tuition-free online examples do not imply covered travel/accommodation.

Read paths cover public catalogue browsing, enrolled learning/downloadable course files, the actually fetched PDF guidelines, and requests for additional programme documentation. The October 2024 [data policy](https://classroom.oceanteacher.org/admin/tool/policy/view.php?versionid=8) says documentation/metadata can be requested; the 2026 guidelines and report now download publicly without an account. Write paths describe approved course development/upload and enrolled learner assignments/feedback. These are actual content/assessment workflows, not a misleading OceanExpert profile-editing route described as an OTGA write API. No account, consent acceptance, registration, submission or message was sent.

Types use approved catalogue_records, documents and media. Formats use HTML for actual public catalogue/learning pages and PDF specifically for the publicly downloaded OTGA guidelines hosted through OceanExpert. Moodle is not a format. SCORM/ScormHero use and H5P activities are explicitly documented in guidelines §4.4; they have no approved current vocabulary IDs, so remain prose and a Standards gap. ISO 29993:2017 is learning-service certification, renewed June 2025, not a data-standard assignment. Standards taught in OBIS/MEDIN courses do not automatically describe the training platform’s own data.

**Licence conflict:** guidelines p.3 and box9.1 state CC BY-NC-SA 4.0 unless otherwise stated; the homepage displays the same licence. Yet §9 also says CC BY4.0 and mixes in incompatible commercial-use wording. The record describes the discrepancy and requires checking each resource, including third-party material. It does not silently choose a blanket unrestricted licence.

[ODIS catalogue entry 359](https://catalogue.odis.org/view/359), last content update October 2021, names OTGA but supplies no ODIS-Arch URL, says metadata standard “none”, and has a stale/incorrect offline assessment despite a live classroom. Its ODIS-Arch Type text is Sitemap without a corresponding URL. A source-directory entry does not establish registered node participation, working harvesting or schema.org. No public OTGA machine API or bulk route was verified; Moodle capabilities and OceanExpert’s separate API are insufficient. `routes` and gallery remain empty. Root’s `public-course-catalog.png` is research evidence with a policy banner, not a prepared public gallery asset.

## All six relationship outcomes

| Type | Result |
| --- | --- |
| governs | IODE → OTGA, scoped to committee/programme workplan and budget oversight evidenced by IODE-28 instructions and the SG-V final report. No unilateral governance from funders or individual participating countries. |
| operates | IODE → OTGA, secretariat, shared platform, administration and quality management in the 2026 guidelines. Centre delivery and a “Powered by Eummena” footer are not enough to assert additional platform operators. |
| funds | Five incoming edges: Flanders, IOC-UNESCO, Norad, LifeWatch ERIC and Ireland’s Marine Institute. All scopes/periods below. |
| member_of | No supported edge within allowed endpoint types. Centre membership is documented, but organization → system membership is invalid in this model. The centres are institutions, not invented system nodes. ODIS listing and programme hierarchy do not establish a valid membership edge. |
| publishes_to | Four incoming edges: MEDIN, VLIZ, IODE and ZMT, each tied to actual named course content. No platform-wide scientific-data publication inferred from a training topic. |
| syncs_to | OTGA → OceanExpert, explicitly documented archival/linked alumni data. No reverse transfer, cadence, public bulk export or ODIS/OBIS/BBNJ sync asserted. |

Funding:

- **Flanders:** FUST OTGA2 was major financial support for the preceding four years and ended December 2024; its narrative report was approved April 2025. A separate named 2024 co-design course also credits UNESCO/Flanders FUST. No perpetual 2026 operating grant inferred.
- **IOC-UNESCO:** SG-V §3.5 distinguishes about US$150,000 requested for 2025 core activities from **US$70,000 available and used**. The latter is the edge’s amount, not a total OTGA budget. More than US$600,000 estimated extra-budgetary resources mobilized across centres/partners is separately reported and excludes in-kind contributions.
- **Norad and LifeWatch ERIC:** the current catalogue explicitly credits financial support for development of **Contributing and publishing datasets to OBIS**, course1196, updated 2025/2026. Access is restricted to invited OBIS-node staff/collaborators. The page contradicts itself on 15 versus 31 December 2026 closure, so the edge uses the edition rather than an exact end day.
- **Norad:** additional explicit financial support for the 2024 co-design course and the 2025 ADAPT course via the Norad–UNESCO Programme Cooperation Agreement. Amounts/payment dates unknown.
- **Marine Institute Ireland:** [UNESCO-IOC’s 27 May 2024 announcement](https://oceandecade.org/fr/news/ocean-decade-launches-new-online-course-on-co-design/) names Government of Ireland support **through its Marine Institute** for the co-design course. The Institute is the named channel; no duplicate direct-country edge or current general grant.

Publication:

- [MEDIN’s own workshop page](https://medin.org.uk/data-standards/medin-workshops) names September/October 2026 and February 2027 OTGA-hosted courses with chapters, assignments and quizzes.
- SG-V lists VLIZ’s 23 February 2024 Nagoya Protocol/ABS course and May–August 2024 Biological Data Management content.
- IODE publishes Ocean Data Management and OBIS learning courses; the actual updated OBIS course is in the 2026 catalogue.
- The May 2024 UNESCO-IOC announcement identifies ZMT as co-developer of the six-module co-design course with OTGA.
- INVEMAR publication was withheld after semantic review. The ADAPT preview, course1011, identifies the institution as partner, venue and contact and says local trainers/international experts designed content; it does not explicitly attribute provision of learning materials to INVEMAR as an institution. This is insufficient for publishes_to. Its unused endpoint draft was removed; the evidence remains in the research folder.

The OceanExpert edge is stronger than a calendar hyperlink: OTGA’s policy explicitly archives participant/facilitator/expert information in OceanExpert linked to Moodle alumni, and guidelines §4.1 repeat it. Full records are restricted to the secretariat and IODE IT support; public completion/profile information is only a subset. Transfer technology and refresh cadence are undocumented. `oceanexpert-edge.json` provides the exact shared edge for other workers.

## Dependencies and withheld candidates

All seven retained new endpoints returned404 and were checked against canonical searches/index: `ioc-unesco` (organization), `medin` (organization partnership), `oceanexpert` (system), `norad`, `lifewatch-eric`, `marine-institute-ireland`, `leibniz-centre-for-tropical-marine-research` (organizations). Root reserved these IDs. Minimal six-language identity payloads are in `endpoint-drafts.json`; they are not rich institution backfills. IOC’s homepage encounters bot verification in one client, so its source is the readable official IODE programme page. Marine Institute’s guessed older about-path returned404; its verified working homepage is used instead.

Withheld: IOC CHM-TMT and BBNJ operational identity/matching claims; direct ODIS or Ocean InfoHub ingestion; reverse OceanExpert replication; OBIS dataset sync based only on training; unilateral country governance; invalid institution-to-system membership; generic host contributions without amounts/financial scope; forthcoming Nippon/Blue Carbon training plans; broad EU/GEF project affiliations without a bounded OTGA financial recipient/period verification. Other centre/affiliate relationships are documented as programme context, not inferred operator or governance edges. No new discipline/type/format/standard/metric/access vocabulary was added.

## Validation and release dependency

- Local `validateRecordAggregateContentInput` and `validateRecordQuality` pass. All 32 referenced owner-local sources resolve, all 12 edge triples are unique and endpoint-valid, and all seven endpoint drafts pass. See `validation-local.json`.
- Create-only API dry run after fresh404: HTTP200, valid:false, **75 issues**. `validation-api.json` contains every exact path/message. There are 68 legacy-production-contract issues (singular access method/source, retired relationshipReview and recordCount/storageSize fields, old write-type vocabulary) and 7 missing-endpoint issues. These were reported before retry. No obsolete fields were reintroduced and no content was applied. Current contract deployment, dependency creation under future authorization and a fresh dry run are required before apply.
- Public source/access probes: **19/20 HTTP200**, including actual PDF response types. The French OceanDecade co-design article returns403 to Python but its official full article was readable through web research; the English path also blocks that client. This is an explicitly retained client-dependent source restriction, not an access path. See `validation-urls.json`.
- Required `npm --workspace server run validate:urls` was attempted; its repository-wide database read failed with `AggregateError [EPERM]` connecting to localhost PostgreSQL (`::1:5432`, `127.0.0.1:5432`) before checking URLs. The direct candidate probes above cover this draft; root owns the combined database rehearsal.

Remaining uncertainties are explicit research gaps or scoped edge notes. Rich depth is a proposed research status only; no human review is claimed.

Authenticated endpoint snapshots containing reviewer metadata are stored under the local `.release/research-evidence/2026-09-10-priority-rich-records/` archive; see the batch README.
