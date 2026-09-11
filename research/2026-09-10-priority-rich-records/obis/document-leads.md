# OBIS: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

OBIS (Ocean Biodiversity Information System)

Why:  the single most CHM-aligned source: IOC-UNESCO programme, global, ABNJ-inclusive, Darwin Core, open, an ODIS node, and already the harvest point for ISA DeepData. Serves biodiversity evidence across MGR, ABMT and EIA. OBIS already holds information on 2.7 million sampling events in ABNJ.

Record:

Ocean Biodiversity Information System (OBIS)
Operated by IOC-UNESCO IODE
https://obis.org/
Global open-access marine biodiversity clearing-house aggregating quality-controlled species occurrence records, environmental measurements, and DNA-derived data from a federated network of regional and thematic nodes.

Gallery item
OBIS occurrence record structure. Capture the OBIS mapper detail view showing a species occurrence with Darwin Core fields, dataset provenance, and the linked WoRMS taxon.
Source: OBIS mapper (https://portal.obis.org/)

Narrative
OBIS began in 2000 as the data component of the Census of Marine Life and was adopted by IOC-UNESCO in 2009 under its International Oceanographic Data and Information Exchange programme. It is structured as a federation rather than a single database: 38 regional and thematic nodes, drawing on over 1,000 institutions and over 6,000 scientists across 99 countries, publish quality-controlled datasets that OBIS harmonizes into a single global index. Current holdings are roughly 222 million species observations covering 207,000 marine species across 7,349 datasets, alongside 83 million DNA sequences and 421 million measurement-or-fact records. All taxonomy is validated against WoRMS and non-marine records are dropped, which makes OBIS the marine-specific counterpart to GBIF and the natural join point for any marine catalogue. Its coverage of areas beyond national jurisdiction is unusually strong for an aggregator: IOC-UNESCO told BBNJ PrepCom 1 in April 2025 that OBIS already holds information on 2.7 million sampling events in ABNJ. Access runs from a web mapper through a public REST API to a cloud-native GeoParquet snapshot on AWS; contribution is exclusively through nodes using the OBIS/GBIF Integrated Publishing Toolkit. Two caveats matter for reuse: the aggregate dataset is CC BY-NC even though most contributing datasets are CC0 or CC BY, and the data are presence-only, so absence cannot be inferred and deep-sea sampling effort is highly uneven.

Profile
 Entity type: System
 Record depth: Rich
 Role: Reference Backbone
 Operator country: INT
 Discipline: Marine Biodiversity
 Geographic scope: Global, including ABNJ
 Part of: IOC-UNESCO IODE; ODIS
 Aliases: OBIS, Ocean Biogeographic Information System (former name)

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Occurrence / Observation; Abundance And Presence-Absence; Environmental And Essential Ocean Variables; Genomic / Sequence (eDNA and DNA-derived); Geographic / Spatial; Metadata Catalogue / Registry; Taxonomy / Nomenclature
 Formats: REST API (JSON); Darwin Core; Darwin Core Archive; Ecological Metadata Language; Extended MeasurementOrFact; CSV / Tabular; GeoParquet Cloud Snapshot; R Package Interface
 Standards: Darwin Core; Ecological Metadata Language; WoRMS Taxonomy (LSID); CC0 / CC BY / CC BY-NC 4.0 Reuse Terms; OBIS Quality Control Flags

Records
 222,000,000 records
 Species observations reported on the OBIS homepage, spanning 207,000 marine species across 7,349 datasets, plus 83 million DNA sequences and 421 million measurement-or-fact records. Note that an older GBIF network snapshot reports 310 million occurrences against 3,507 datasets; the obis.org figure is the current headline and the discrepancy reflects different counting units.
 Source: OBIS homepage statistics, observed 2026

Database size
 ~50 GB
 Compressed GeoParquet export of the full OBIS index published to AWS S3. This is the analysis-ready snapshot, not the live production database.
 Source: iobis/obis-open-data (https://github.com/iobis/obis-open-data), observed 2026

Read access

Web mapper
 Read | Web UI
 Free public search and mapping by species, taxon, area, depth and time. Downloads from the mapper expose the full Darwin Core field set, so this is the fastest route to a defensible extract for a specific area of interest.
 https://portal.obis.org/
 Source: OBIS Manual, Data Access (https://manual.obis.org/access)

OBIS REST API
 Read | Rest Api
 Public RESTful API supporting occurrence, taxonomic, spatial, depth and temporal queries and returning JSON. Taxonomy is WoRMS-validated at query time. No API key is described.
 https://api.obis.org/
 Source: OBIS Manual, Data Access (https://manual.obis.org/access)

Full exports and GeoParquet snapshot
 Read | Cloud Table Snapshot
 Periodic full exports of quality-controlled presence records, plus a cloud-native GeoParquet version on AWS S3 accessible without credentials. This is the route for anyone doing global-scale analysis rather than area queries.
 https://github.com/iobis/obis-open-data
 Source: iobis/obis-open-data

robis R package
 Read | R Package
 Programmatic access to occurrence, checklist and dataset endpoints, including the DNADerivedData extension for eDNA records.
 https://manual.obis.org/access
 Source: OBIS Manual, Data Access

Write / contribution access

Node publishing via IPT
 Submit | Curated Node Publication
 Data are not submitted to OBIS directly. Providers work through a regional or thematic node, publishing a Darwin Core Archive with EML metadata via the Integrated Publishing Toolkit. The node reviews and endorses before harvest. Datasets must carry an explicit CC0, CC BY or CC BY-NC licence, and credit remains attributed to the source dataset and its institution throughout.
 https://manual.obis.org/ipt
 Source: OBIS Manual, IPT (https://manual.obis.org/ipt)

Template and CSV workflow
 Submit | Template Csv Workflow
 Providers without their own systems can format data using OBIS Darwin Core templates and hand them to a node manager for publication. This is the standard route for smaller contributors and for institutions in developing States.
 https://manual.obis.org/
 Source: OBIS Manual

Usage

Species observations: 222,000,000 (OBIS homepage statistics, observed 2026)
 Marine species: 207,000 (OBIS homepage statistics, observed 2026)
 Datasets: 7,349 (OBIS homepage statistics, observed 2026)
 DNA sequences: 83,000,000 (OBIS homepage statistics, observed 2026)
 Measurement-or-fact records: 421,000,000 (OBIS homepage statistics, observed 2026)
 ABNJ sampling events: 2,700,000 (IOC-UNESCO statement to BBNJ PrepCom 1, April 2025)
 Nodes: 38 (OBIS homepage, observed 2026)
 Countries engaged: 99 (OBIS homepage, observed 2026)
 Contributing institutions: 1,000+ (OBIS homepage, observed 2026)

Connections
 IOC-UNESCO IODE: operates (incoming)
 World Register of Marine Species: taxonomic backbone (outgoing dependency)
 BBNJ Clearing-House Mechanism (CHM): syncs to (outgoing)
 ODIS / Ocean InfoHub: node (member)
 ISA DeepData: harvested via ISA node since June 2021 (incoming)
 GBIF: data exchange (bidirectional)
 European Ocean Biodiversity Information System: node (incoming)
 BISMaL: node (incoming)
 MolluscaBase: syncs to (outgoing)
 AquaMaps: syncs to (incoming)
