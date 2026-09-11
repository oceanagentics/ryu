# ODIS: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

ODIS

Why:  ODIS is the closest existing thing to what Ryu is trying to be. ODIS as the interoperability standard Ryu conforms to. ODIS-Arch defines how a source exposes its metadata, using schema.org serialized as JSON-LD with SHACL validation. If Ryu's records are ODIS-conformant, Ryu becomes harvestable into the wider federation rather than a walled garden, and every source Ryu describes can be cross-referenced against how ODIS already describes it.

Record:

ODIS Catalogue of Sources (ODISCat) / Ocean Data and Information System
 Operated by IOC-UNESCO IODE, maintained by Flanders Marine Institute (VLIZ)
 https://catalogue.odis.org/
 Annotated catalogue of ocean-related data and information sources, and the metadata federation backbone underpinning IOC's clearing-house ecosystem.

Gallery item
 ODISCat source record view. Capture a catalogued source showing its description, content type classification, organisation, and node status within the federation.
 Source: ODIS Catalogue of Sources (https://catalogue.odis.org/)

Narrative
 ODISCat is IOC-UNESCO IODE's browsable catalogue of ocean-related web-based sources, products and services. It holds no data itself; its function is to describe what exists and point users to it, which makes it a registry rather than a repository. As displayed on the site, it currently catalogues 3,137 sources, of which 2,191 are searchable. It sits inside the wider Ocean Data and Information System, a federation that has grown to over 55 nodes from more than 48 institutional partners, relaying metadata from roughly 800 organisations into a global search hub sharing more than 130,000 metadata records and feeding an ODIS knowledge graph. The federation works through a shared technical pattern called ODIS-Arch, in which each node exposes structured metadata as schema.org serialized in JSON-LD, discoverable through sitemaps and sitegraphs and validated against SHACL shape graphs. Nodes remain independently operated: ODIS harvests and links rather than ingesting and owning, which is what distinguishes a federation from a portal. The lineage is directly relevant to BBNJ. The 2020 IOC proposal that created Ocean InfoHub framed the whole architecture as powering an IOC clearing-house mechanism for transfer of marine technology, and IOC subsequently proposed an eighteen-month pilot delivering a functional BBNJ Clearing-House prototype by COP1 in January 2027, with a fully operational mechanism by COP2. Three caveats belong on the record. It is a registry, not a data source, so its records describe rather than contain. Conformance and completeness vary considerably between nodes, since each node maintains its own metadata quality. And it overlaps conceptually with any other ocean data catalogue, including Ryu itself, which makes it simultaneously a model, a potential ingestion source, and the most obvious point of comparison.

Profile
 Entity type: System
 Record depth: Moderate
 Role: Interoperability And Discovery Backbone
 Operator country: INT (IOC-UNESCO IODE), BE (VLIZ maintains)
 Discipline: Ocean Data Interoperability And Discovery
 Geographic scope: Global
 Part of: IOC-UNESCO IODE; Ocean InfoHub
 Aliases: ODISCat, ODIS Catalogue, Ocean Data and Information System

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Source Descriptions And Metadata; Node Registrations; Product And Service Records; Organisation And Expert References; Entity Relationships; Metadata Catalogue / Registry
 Formats: Web UI; Structured Metadata (sitemaps and sitegraphs); JSON-LD; RDF Knowledge Graph
 Standards: schema.org; ODIS-Arch Architecture; SHACL Shape Graph Validation; OceanExpert Identifiers; DCAT-Aligned Metadata; Open Documentation

Records
 3,137 sources
 Ocean-related sources catalogued in ODISCat, of which 2,191 are searchable. Separately, the wider ODIS federation shares over 130,000 metadata records through its global search hub, which is a different unit describing the harvested content rather than the catalogue entries.
 Source: ODIS Catalogue of Sources, observed 2026

Database size
 Not published
 IOC-UNESCO does not report a storage figure. As a registry pointing to external sources, catalogue size is better expressed in entries than in bytes.
 Source: ODIS Catalogue of Sources, observed 2026

Read access

ODISCat web interface
 Read | Web UI
 Free public browse and search of catalogued sources across sixteen content types, filterable by organisation, region and theme. No registration required.
 https://catalogue.odis.org/
 Source: ODIS Catalogue of Sources

Ocean InfoHub global search
 Read | Web UI
 Federated search across the harvested metadata of all ODIS nodes, surfacing datasets, documents, experts, institutions, projects, training and vessels in one place. This is the user-facing product of the federation rather than the catalogue itself.
 https://oceaninfohub.org/
 Source: Ocean InfoHub

Node structured metadata
 Read | Structured Metadata
 Each node exposes harvestable metadata as schema.org JSON-LD via sitemaps and sitegraphs, feeding the ODIS knowledge graph. This is the machine route and the pattern any new node must implement to join.
 https://catalogue.odis.org/odis
 Source: ODIS

ODIS Book documentation
 Read | Documentation
 The technical specification for ODIS-Arch, covering metadata patterns, thematic profiles and SHACL validation. This is the reference document for anyone aligning a catalogue schema to ODIS rather than inventing one.
 https://book.odis.org/
 Source: ODIS Book

Write / contribution access

Node registration
 Submit | Federation Registration
 Organisations join by obtaining an OceanExpert identifier and registering their data system as an ODIS node exposing a structured metadata catalogue. The node continues to operate its own systems independently; ODIS harvests rather than takes custody. This is the route by which a new catalogue becomes part of the federation rather than a competitor to it.
 https://book.odis.org/gettingStarted.html
 Source: ODIS Book

Source suggestion
 Submit | Curated Catalogue Submission
 Individuals and organisations can propose sources for inclusion in ODISCat, which are reviewed before publication.
 https://catalogue.odis.org/
 Source: ODIS Catalogue of Sources

Usage

Sources catalogued: 3,137 (ODIS Catalogue of Sources, observed 2026)
 Searchable sources: 2,191 (ODIS Catalogue of Sources, observed 2026)
 Federation nodes: over 55 (IOC-UNESCO IODE, observed 2026)
 Institutional partners: over 48 (IOC-UNESCO IODE, observed 2026)
 Organisations represented via nodes: approximately 800 (IOC-UNESCO IODE, observed 2026)
 Federated metadata records in global search: over 130,000 (IOC-UNESCO IODE, observed 2026)
 Content types classified: 16 (ODIS Catalogue of Sources)

Connections
 IOC-UNESCO IODE: operates (incoming)
 Flanders Marine Institute: maintains (incoming)
 Ocean InfoHub: global search product of the federation (outgoing)
 OBIS: node (incoming)
 ISA DeepData: node since May 2025 (incoming)
 OceanExpert: node and identifier authority (bidirectional)
 EMODnet: node (incoming)
 IOC Clearing-House Mechanism for the Transfer of Marine Technology: architecture developed to power it (outgoing)
 BBNJ Clearing-House Mechanism: prospective technical substrate for the COP1 prototype (outgoing)
