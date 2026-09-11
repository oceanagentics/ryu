# European Nucleotide Archive (ENA/INSDC): backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

European Nucleotide Archive (ENA) — INSDC

Why:  the DSI pillar's core: the open, global nucleotide archive to which BBNJ Article 12 DSI notifications will de facto point.

Record:

European Nucleotide Archive (ENA)
 Operated by EMBL's European Bioinformatics Institute (EMBL-EBI)
 https://www.ebi.ac.uk/ena
 Open-access archive of nucleotide sequence data spanning raw reads, assemblies and annotated sequences, and one of three founding members of the International Nucleotide Sequence Database Collaboration.

Gallery item
 ENA Browser record view. Capture a study or sample record showing the accession, associated BioSample metadata, collection date and country qualifiers, linked runs and assemblies, and cross-references.
 Source: ENA Browser (https://www.ebi.ac.uk/ena/browser/home)

Narrative
 ENA traces back to the EMBL Data Library, established in 1982 as the first international nucleotide sequence resource, and is now operated by EMBL-EBI at the Wellcome Genome Campus in Hinxton, UK. It is one of three INSDC partners alongside GenBank at NCBI in the United States and DDBJ in Japan; the three exchange records daily, so a sequence deposited with any one becomes available through all three. That daily exchange is the operationally important fact for anyone tracking digital sequence information: a State Party's Article 12 utilization notification may point at a GenBank accession, a DDBJ accession or an ENA one, and all three resolve to the same underlying deposit. Holdings are large and growing fast, with over 37 million raw read datasets archived and 26 trillion nucleotides represented in assembled and annotated collections, against 62.8 PB of archived data reported the previous year. ENA is an ELIXIR Core Data Resource committed to FAIR principles, and its content is open with no access restrictions. Access runs through two distinct APIs, one for metadata search and one for record retrieval, plus FTP bulk download and a browser interface; submission runs through Webin, either interactively, programmatically, or via a broker acting on a submitter's behalf. One change matters directly for BBNJ provenance: following an INSDC minimum-standards update in March 2023, country and collection date became mandatory for newly registered BioSamples, and were extended to all newly submitted GenBank and SRA sequences by the end of December 2024. The critical caveat for CHM use is what ENA does not hold: it carries no areas-beyond-national-jurisdiction flag, no benefit-sharing status, and no link to a BBNJ batch identifier. Provenance in ENA is a country field, which by definition does not describe the high seas, so any ABNJ linkage has to be constructed by the Clearing-House rather than read out of ENA.

Profile
 Entity type: System
 Record depth: Rich
 Role: Archive
 Operator country: UK (EMBL-EBI host), INT (EMBL is intergovernmental)
 Discipline: Genomics And Molecular Biology
 Geographic scope: Global
 Part of: International Nucleotide Sequence Database Collaboration (INSDC); ELIXIR
 Aliases: ENA, EMBL-Bank (historical), EMBL Data Library (historical)

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Genomic / Sequence; Raw Sequencing Reads; Genome Assemblies; Annotated And Functional Sequence; Sample And Study Metadata; Metadata Catalogue / Registry
 Formats: Portal API (JSON, TSV); Browser API; FTP Bulk Download; EMBL Flatfile; FASTA; FASTQ; XML; Metadata Schema
 Standards: INSDC Accession System; BioSample And BioProject Records; NCBI Taxonomy; INSDC Minimum Spatiotemporal Metadata Standards; FAIR Principles; ELIXIR Core Data Resource; Open / Unrestricted Reuse Terms

Records
 37,000,000 records
 Raw read datasets archived, alongside 26 trillion nucleotides represented across assembled and annotated collections. Counts grow continuously as submissions arrive daily.
 Source: Nucleic Acids Research, "European Nucleotide Archive in 2025," observed 2026

Database size
 62.8 PB
 Archived data volume held at EMBL-EBI as reported in the preceding annual update. This is the archive footprint, not a downloadable snapshot.
 Source: Nucleic Acids Research, "European Nucleotide Archive in 2024," observed 2025

Read access

ENA Browser
 Read | Web UI
 Free public interface for searching and viewing studies, samples, runs, assemblies and sequences, with no registration required. Records display accessions, metadata and cross-references to the other INSDC partners.
 https://www.ebi.ac.uk/ena/browser/home
 Source: EMBL-EBI ENA Browser

Portal API
 Read | Rest Api
 Advanced metadata search and filtering across ENA's data model, returning JSON or TSV. This is the route for finding records by sample attributes such as collection country, collection date or host organism. Serves roughly 28 million requests per month delivering 1.6 TB.
 https://www.ebi.ac.uk/ena/portal/api/
 Source: Nucleic Acids Research, "European Nucleotide Archive in 2025"

Browser API
 Read | Rest Api
 Record and sequence retrieval by accession, returning EMBL flatfile, FASTA, XML or JSON. Distinct from the Portal API, which searches metadata rather than retrieving records. Serves over 90 million requests per month delivering 3.3 TB.
 https://www.ebi.ac.uk/ena/browser/api/
 Source: Nucleic Acids Research, "European Nucleotide Archive in 2025"

FTP bulk download
 Read | Download Portal
 Bulk retrieval of sequence and annotation data in EMBL, FASTA and XML formats, plus raw read files. The route for anyone pulling data at scale rather than by accession.
 https://ftp.ebi.ac.uk/pub/databases/ena/
 Source: EMBL-EBI ENA documentation

Globus and cloud transfer
 Read | Bulk Transfer
 Managed large-volume transfer for petabyte-scale retrieval where FTP is impractical.
 https://www.ebi.ac.uk/ena/browser/downloading-data
 Source: EMBL-EBI ENA documentation

Write / contribution access

Webin interactive submission
 Submit | Web Submission
 Browser-based submission of studies, samples, runs and assemblies. Requires a Webin account. Metadata are validated against NCBI Taxonomy and the INSDC minimum standards, and an INSDC accession is assigned on acceptance. Submitters may set a release date to hold records private until publication.
 https://www.ebi.ac.uk/ena/submit/webin/
 Source: EMBL-EBI ENA submission documentation

Webin programmatic submission
 Submit | Api Write
 Command-line and REST submission for high-volume or automated deposition, including the Webin-CLI validation tool. The standard route for sequencing centres and pipelines.
 https://ena-docs.readthedocs.io/en/latest/submit/general-guide/programmatic.html
 Source: ENA submission documentation

Brokered submission
 Submit | Broker Mediated Deposition
 A registered broker submits on behalf of a data producer, common for consortia and for national or institutional repositories handling deposition for their researchers. Useful context for capacity-constrained submitters.
 https://ena-docs.readthedocs.io/en/latest/submit/general-guide.html
 Source: ENA submission documentation

INSDC daily exchange
 Partner sync | Federated Sync
 Not a submission route for users. ENA, GenBank and DDBJ exchange newly deposited records daily under the INSDC agreement, so a deposit made to any one partner appears in the other two. This is why an accession from any INSDC member resolves against ENA.
 https://www.insdc.org/
 Source: INSDC

Usage

Raw read datasets: over 37,000,000 (Nucleic Acids Research, ENA in 2025)
 Nucleotides in assembled and annotated collections: 26 trillion (Nucleic Acids Research, ENA in 2025)
 Archived data volume: 62.8 PB (Nucleic Acids Research, ENA in 2024)
 Browser API requests: over 90,000,000 per month, 3.3 TB delivered (Nucleic Acids Research, ENA in 2025)
 Portal API requests: approximately 28,000,000 per month, 1.6 TB delivered (Nucleic Acids Research, ENA in 2025)
 Update cadence: continuous submission with daily INSDC exchange (INSDC)
 Mandatory provenance fields: country and collection date required for newly registered BioSamples since May 2023, extended to all new GenBank and SRA submissions by end of December 2024 (INSDC spatiotemporal metadata standards update, March 2023)

Connections
 EMBL-EBI: operates (incoming)
 EMBL: parent intergovernmental organisation (incoming)
 International Nucleotide Sequence Database Collaboration: member of (part of)
 GenBank / NCBI: INSDC partner, daily exchange (bidirectional)
 DNA Data Bank of Japan: INSDC partner, daily exchange (bidirectional)
 ELIXIR: Core Data Resource (member)
 MGnify: downstream analysis resource (outgoing)
 World Register of Marine Species: deep-linked from species pages (incoming)
 OBIS: DNA-derived data linkage (bidirectional)
 BBNJ Clearing-House Mechanism: prospective DSI reference point (outgoing)
