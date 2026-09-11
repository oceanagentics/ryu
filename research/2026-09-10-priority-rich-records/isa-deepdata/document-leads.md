# ISA DeepData: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

ISA DeepData

Why:  the deep-sea/ABNJ database with a direct regulatory mandate; uniquely relevant to ABMT and EIA in the Area. It's the only source in the ten tied to a regulator that already does what BBNJ is about to start doing. ISA already requires environmental baselines before activity, already reviews impact assessments, already designates protected areas in ABNJ through its regional environmental management plans. When a CHM user asks what an EIA baseline for the high seas actually looks like in practice, DeepData holds the only real examples. That's a working precedent for Part IV, not a theoretical one. It's also the interoperability test case. Article 51(3) says the CHM should link to and build on existing databases, and the BBNJ Agreement has to coexist with ISA's mandate rather than override it. ISA became an OBIS node in 2021 and joined ODIS in 2025, so it has already done the thing the CHM will need every partner body to do. If Ryu shows how DeepData connects to OBIS and ODIS, you're demonstrating the interoperation pattern rather than describing it.

Record:

International Seabed Authority DeepData
 Operated by the International Seabed Authority (ISA)
 https://isa.org.jm/deepdata-database/
 Spatial database of environmental and geological data collected under exploration contracts in the Area, the seabed beyond national jurisdiction.

Gallery item
 DeepData map portal. Capture the spatial browse view showing contract areas in the Clarion-Clipperton Zone with sampling stations and layer controls.
 Source: DeepData map portal (https://data.isa.org.jm/isa/map)

Narrative
 The International Seabed Authority is an autonomous intergovernmental organization established under UNCLOS and the 1994 Part XI Agreement, headquartered in Kingston, Jamaica, and mandated to organize and control mineral-related activities in the Area on behalf of humankind. DeepData, made public in 2019, is its central repository for data that exploration contractors are required to submit as a condition of contract. It holds two distinct classes of content: geological and resource data, which are confidential, and environmental and biological data, which are public. Since June 2021 the biological records have been published to OBIS through a dedicated ISA node, and in May 2025 DeepData joined ODIS, coordinated by IOC-UNESCO IODE. The OBIS ISA node showed 207,036 occurrence records covering 2,868 taxa and 931 species across 158 datasets as of 6 September 2026, and the ODIS announcement noted over 800 CTD sampling stations. Coverage concentrates heavily in the Clarion-Clipperton Zone, where most exploration contracts sit. ISA also works with WoRMS on deep-sea taxonomy, jointly producing the first comprehensive CCZ species checklist in 2023. The quality caveats are substantial and documented: a 2023 review in the journal Database found dataset duplication, absent unique identifiers and Darwin Core mis-mapping, though publication through the OBIS node has since improved consistency. Practical access limits matter too. DeepData's own totals are presented through a Power BI dashboard that cannot be extracted programmatically, the site states no open licence, and there is no documented public API or one-click bulk download, so the reliable open route is via OBIS. Contractor contribution figures reported in press releases are self-reported and should be treated with caution.

Profile
 Entity type: System
 Record depth: Moderate
 Role: Regulatory Data Repository
 Operator country: INT
 Discipline: Deep-Sea Environmental And Geological Science
 Geographic scope: The Area (seabed beyond national jurisdiction), concentrated in the Clarion-Clipperton Zone
 Part of: ODIS (since May 2025); OBIS network (via ISA node since June 2021)
 Aliases: DeepData, ISA Deep Seabed and Ocean Database

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Occurrence / Observation (biological); Environmental And Oceanographic (CTD, water column, currents); Geochemical; Physical And Sediment; Navigational And Expedition Metadata; Geological And Resource (confidential, not public)
 Formats: Web Map Portal; Power BI Dashboard; Standardized Reporting Templates; Darwin Core (via OBIS node); CSV
 Standards: ISA Contractor Reporting Templates; Darwin Core (for OBIS publication); WoRMS Taxonomy; ODIS Metadata (since 2025); No Stated Open Licence

Records
 207,036 records
 Occurrence records published through the OBIS ISA node, covering 2,868 taxa and 931 species across 158 datasets. This is the verifiable public figure. DeepData's own holdings are larger but are reported only through a dashboard that does not expose extractable totals.
 Source: OBIS ISA node (https://obis.org/node/9d2d95be-32eb-4d81-8911-32cb8bc641c8), observed 2026-09-06

Database size
 Not published
 ISA does not report a storage figure for DeepData, and the dashboard does not expose one.
 Source: ISA DeepData page, observed 2026

Read access

DeepData map portal
 Read | Web UI
 Spatial browse of environmental and biological data by contract area, station and layer. Free public access with no registration. This is the primary interface for seeing what has been collected where in the Area.
 https://data.isa.org.jm/isa/map
 Source: ISA DeepData

DeepData dashboard
 Read | Dashboard Viewer
 Power BI summary statistics on holdings by data type and contract area. Viewable in a browser but not machine-readable, so figures cannot be extracted programmatically or cited with a stable timestamp.
 https://isa.org.jm/deepdata-database/
 Source: ISA DeepData

OBIS ISA node
 Read | Download Portal
 The reliable open route to DeepData's biological records. Published in Darwin Core through OBIS since June 2021, so records are reachable via the OBIS mapper, the OBIS REST API and full exports, under OBIS licence terms rather than an ISA licence.
 https://obis.org/node/9d2d95be-32eb-4d81-8911-32cb8bc641c8
 Source: OBIS node listing

ODIS metadata
 Read | Structured Metadata
 DeepData joined the ODIS federation in May 2025, exposing harvestable metadata into the ODIS knowledge graph and the Ocean InfoHub global search.
 https://catalogue.odis.org/
 Source: ISA and IOC-UNESCO ODIS announcement, May 2025

Write / contribution access

Contractor data submission
 Submit | Mandated Regulatory Reporting
 Not open to the public. Exploration contractors are required by their contracts with ISA to submit environmental and biological data using standardized ISA reporting templates, on a defined schedule tied to their annual reporting obligations. Geological and resource data are submitted under confidentiality; environmental and biological data become public. This mandatory model is the reason DeepData holds ABNJ baseline data that no voluntary aggregator could assemble.
 https://isa.org.jm/deepdata-database/reporting-templates/
 Source: ISA DeepData reporting templates

Usage

Occurrence records via OBIS ISA node: 207,036 (OBIS, observed 2026-09-06)
 Taxa: 2,868 (OBIS, observed 2026-09-06)
 Species: 931 (OBIS, observed 2026-09-06)
 Datasets: 158 (OBIS, observed 2026-09-06)
 CTD sampling stations: over 800 (ISA and IOC-UNESCO ODIS announcement, May 2025)
 Public launch: 2019 (ISA)
 OBIS node established: June 2021 (OBIS)
 ODIS membership: May 2025 (ISA)
 DeepData internal totals: not recorded, dashboard does not expose extractable values

Connections
 International Seabed Authority: operates (incoming)
 Ocean Biodiversity Information System: publishes to via ISA node (outgoing)
 ODIS / Ocean InfoHub: node (member)
 World Register of Marine Species: taxonomic standard, joint CCZ species checklist (bidirectional)
 GBIF: records propagated via OBIS (outgoing)
 Exploration contractors: mandated data submission (incoming)
 BBNJ Clearing-House Mechanism: prospective interoperating body under Article 51(3) (outgoing)
