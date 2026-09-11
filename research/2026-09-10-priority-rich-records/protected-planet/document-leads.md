# Protected Planet / WDPA: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

Protected Planet / World Database on Protected Areas (WDPA)

Why:  Part III of the treaty is the pillar that creates marine protected areas in the high seas. WDPA is the world's register of protected areas. An Article 19 proposal is an argument that a particular patch of ocean should be protected, and the first question anyone asks is what protection already exists there. WDPA is where you look.

Record:

Protected Planet / World Database on Protected Areas (WDPA)
 Operated by UN Environment Programme World Conservation Monitoring Centre (UNEP-WCMC) with IUCN
 https://www.protectedplanet.net/en
 The authoritative global inventory of terrestrial and marine protected areas and other effective area-based conservation measures, updated monthly from government, NGO and community submissions.

Gallery item
 Protected Planet area detail page. Capture a marine protected area record showing the WDPA ID, boundary geometry, designation type, IUCN category, governance type, legal status and status year, and the reporting authority.
 Source: Protected Planet (https://www.protectedplanet.net/en)

Narrative
 The World Database on Protected Areas dates to 1981 and is a joint product of UNEP and IUCN, compiled and managed by UNEP-WCMC in Cambridge, UK, and delivered publicly through the Protected Planet platform. It is assembled from submissions by national governments, NGOs, private landowners and community organisations, verified against the source authority, and released on a monthly cycle. As of September 2026 it held 312,943 protected areas and roughly 7,400 other effective area-based conservation measures, with marine protected area coverage standing at 9.81% of the ocean across 16,942 marine protected areas, rising to 10.03% when OECMs are included. Every area carries a persistent WDPA ID, and each record follows a defined data standard covering up to 29 standardized attributes, split into a minimum set required for ingestion and a fuller set prioritised for analysis. Data are downloadable as shapefiles, file geodatabases and CSV, exposed through APIs, and mirrored into Google Earth Engine. WDPA is the measurement basis for the CBD's protected-area targets, SDG 14 and IPBES assessments, which is what makes it the accounting system rather than merely a map. Three caveats matter. Coverage depends on data holders submitting accurate and current information, so the database lags reality unevenly by country. Commercial use is restricted and licensed separately through IBAT. And high seas coverage is currently very thin, since almost all existing marine protection sits inside national jurisdiction. That last point is not a defect but the baseline condition BBNJ Part III is designed to change, which is exactly why a CHM user needs this record.

Profile
 Entity type: System
 Record depth: Rich
 Role: Reference Backbone
 Operator country: UK (UNEP-WCMC host), INT (UNEP and IUCN joint product)
 Discipline: Conservation And Area-Based Management
 Geographic scope: Global, predominantly within national jurisdiction
 Part of: UNEP-WCMC; IUCN World Commission on Protected Areas
 Aliases: WDPA, Protected Planet, WDPCA (World Database on Protected and Conserved Areas), WD-OECM

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Geographic / Spatial (boundaries and points); Protected Area Designations; Other Effective Area-Based Conservation Measures; Governance And Management Attributes; Legal Status And Designation Dates; Metadata Catalogue / Registry
 Formats: Shapefile; File Geodatabase; CSV / Tabular; API; Web UI; Google Earth Engine Asset
 Standards: WDPA ID Persistent Identifiers; WDPA Data Standard (up to 29 standardized attributes, 31 for OECMs); IUCN Protected Area Management Categories; IUCN Governance Types; Custom Licence With Commercial Restriction

Records
 312,943 records
 Protected areas listed on Protected Planet, alongside roughly 7,400 other effective area-based conservation measures. Of these, 16,942 are marine protected areas. Updated monthly, so counts shift with each release.
 Source: Protected Planet statistics, observed 2026-09

Database size
 Not published
 UNEP-WCMC does not report a storage figure. Monthly releases are distributed as shapefile, file geodatabase and CSV packages.
 Source: Protected Planet, observed 2026-09

Read access

Protected Planet web interface
 Read | Web UI
 Free public search and mapping of protected areas and OECMs by country, designation, IUCN category and marine or terrestrial realm. Individual area pages expose the WDPA ID, boundary, attributes and reporting source.
 https://www.protectedplanet.net/en
 Source: Protected Planet

Monthly download
 Read | Download Portal
 Full monthly release in shapefile, file geodatabase and CSV, accompanied by the source table identifying who supplied each record and the WDPA user manual explaining every attribute. Registration and acceptance of terms required.
 https://www.protectedplanet.net/en/thematic-areas/wdpa
 Source: Protected Planet

Protected Planet API
 Read | Rest Api
 Programmatic query of protected area records and attributes. Requires a free API token.
 https://api.protectedplanet.net/
 Source: Protected Planet API documentation

Google Earth Engine asset
 Read | Cloud Dataset
 Current WDPA polygons and points hosted as an Earth Engine asset, suited to spatial analysis at scale without downloading the full release.
 https://developers.google.com/earth-engine/datasets/catalog/WCMC_WDPA_current_polygons
 Source: Google Earth Engine data catalog

Marine Protection Atlas
 Read | Third Party Analysis Layer
 An independent assessment layer built on WDPA that classifies marine areas by actual level of protection rather than designation alone. Useful context, but a separate product with its own methodology, not a WDPA output.
 https://mpatlas.org/
 Source: Marine Conservation Institute

Write / contribution access

Government and authority submission
 Submit | Curated Authority Submission
 Data are supplied by national governments and other designating authorities, then verified by UNEP-WCMC against the source before publication. Submitting authorities are named in the source table accompanying each release, and remain the authority of record for their entries. This is the primary write path and is not open to the general public.
 https://www.protectedplanet.net/en/resources/wdpa-manual
 Source: WDPA User Manual

NGO, private and community submission
 Submit | Curated Contributor Submission
 NGOs, private landowners and community organisations may submit areas under their governance, following the same WDPA data standard and verification process. This route matters for privately and community-governed marine areas that no government would otherwise report.
 https://www.protectedplanet.net/en/resources/wdpa-manual
 Source: WDPA User Manual

Error reporting
 Submit | Open Feedback
 Users can report inaccuracies in existing records to UNEP-WCMC, which routes corrections back to the reporting authority rather than editing unilaterally.
 https://www.protectedplanet.net/en/about
 Source: Protected Planet

Usage

Protected areas: 312,943 (Protected Planet, observed 2026-09)
 Marine protected areas: 16,942 (Protected Planet, observed 2026-09)
 Other effective area-based conservation measures: approximately 7,400 (Protected Planet, observed 2026-09)
 Marine protected area coverage: 9.81% of the ocean (Protected Planet, observed 2026-09)
 Marine coverage including OECMs: 10.03% (Protected Planet, observed 2026-09)
 Standardized attributes per record: up to 29, and 31 for OECMs (WDPA User Manual)
 Update cadence: monthly release (Protected Planet)
 Established: 1981 (UNEP-WCMC)

Connections
 UNEP-WCMC: operates (incoming)
 IUCN World Commission on Protected Areas: co-produces (incoming)
 Convention on Biological Diversity: indicator source for protected-area targets (outgoing)
 Sustainable Development Goal 14: indicator source (outgoing)
 IPBES: indicator source (outgoing)
 IBAT: commercial licensing channel (outgoing)
 National designating authorities: report protected areas (incoming)
 Marine Protection Atlas: derived analysis layer (outgoing)
 BBNJ Clearing-House Mechanism: prospective destination for Part III area designations (outgoing)
