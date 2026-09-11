# WoRMS: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

WoRMS — World Register of Marine Species

Why:  the authoritative marine taxonomic backbone that OBIS, GBIF and FishBase align to; underpins every species-name reference in the CHM.

Record:

World Register of Marine Species (WoRMS)
 Operated by Flanders Marine Institute (VLIZ)
 https://www.marinespecies.org/
 Authoritative expert-curated global register of scientific names of marine organisms, covering accepted names, synonyms, classification, literature sources, and partial trait data.

Gallery item
 WoRMS taxon detail page. Capture a species record showing the accepted name, authority, AphiaID, full classification, synonymy, source references, and the environment flag.
 Source: WoRMS taxon details (https://www.marinespecies.org/aphia.php?p=taxdetails&id=127160)

Narrative
 WoRMS launched online in 2007 and was officially inaugurated in June 2008, holding 122,500 validated names contributed by 55 researchers from 17 countries at the outset. It grew out of the European Register of Marine Species and other registers held at VLIZ, developed within the Census of Marine Life community. Rather than run separate databases per project, VLIZ built a single consolidated platform called Aphia; marinespecies.org is the public interface to the marine taxa held in Aphia. As of 7 September 2026 the site reported 250,570 accepted extant marine species (98% checked by an editor), 524,081 names including synonyms, and 55,262 species with an image, curated by 371 editors. It passed 250,000 accepted extant marine species on 13 May 2026. Governance runs on three levels: a 12-member Steering Committee elected from the Editorial Board, the Editorial Board itself where taxonomic experts hold authority over their own groups, and a Data Management Team at VLIZ that maintains the system and protects the persistence of AphiaIDs. Content is controlled by the experts rather than by database managers, and the register is updated daily. Access is free and open through the website, a REST service, a SOAP service, resolvable LSIDs, a bulk taxon-match tool, a Linked Data Event Stream, and a Darwin Core Archive export published through GBIF. Three caveats matter for reuse: WoRMS is a names register, not an occurrence or sequence database, so it must be joined to OBIS or GenBank to answer most questions; trait coverage is partial, with quantitative body size populated for roughly 9% of accepted species; and whole-database redistribution requires prior written agreement, with images under a more restrictive licence than text.

Profile
 Entity type: System
 Record depth: Rich
 Role: Reference Backbone
 Operator country: BE (host institution VLIZ), INT (editorial governance)
 Discipline: Marine Taxonomy And Nomenclature
 Geographic scope: Global Marine Taxa
 Part of: Aphia platform; LifeWatch Species Information Backbone
 Aliases: WoRMS, MarineSpecies.org, Aphia (platform), successor to the European Register of Marine Species (ERMS)

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Taxonomy / Nomenclature; Synonymy And Authorities; Higher Classification; Vernacular Names; Literature And Source References; Geographic / Spatial (distributions); Occurrence / Observation (limited specimen records); Traits / Ecology (partial); Images And Media
 Formats: REST API (JSON); SOAP Web Service (XML); Darwin Core Archive; Darwin Core CSV; RDF / XML (via LSID resolution); Linked Data Event Stream (Turtle, JSON-LD, RDF-XML, N-Triples); Controlled Vocabulary; Web Pages
 Standards: AphiaID Persistent Identifiers; LSID (urn:lsid:marinespecies.org:taxname:AphiaID); Darwin Core Taxon Terms; Dublin Core; DOI 10.14284/170; CC BY 4.0 (text); CC BY-NC-SA 4.0 (images)

Records
 250,570 records
 Accepted extant marine species reported on the WoRMS homepage, 98% checked by an editor, alongside 524,081 names including synonyms. This counter changes daily as editors add and revise records: the same field read 250,596 the previous day.
 Source: WoRMS homepage statistics, observed 2026-09-07

Database size
 Not published
 WoRMS does not report a storage figure. The underlying Aphia platform is described as an MS SQL database containing over 400 fields across more than 80 related tables.
 Source: WoRMS About page (https://www.marinespecies.org/about.php), observed 2026-09-07

Read access

Web user interface
 Read | Web UI
 Free public search and browse across taxa, classification, literature, distributions, specimens, images and editors. No registration required.
 https://www.marinespecies.org/
 Source: WoRMS homepage

REST web service
 Read | Rest Api
 Open JSON API supporting AphiaID lookup, exact and fuzzy name matching, classification, synonyms, vernaculars, sources, distributions, attributes and external identifiers. No API key or authentication. Two caveats: HTTPS has been enforced since January 2022, and CORS is not enabled, so direct in-browser calls may fail. Not to be used for harvesting the full database, for which a dump should be requested instead.
 https://www.marinespecies.org/rest/
 Source: WoRMS Web Services page (https://www.marinespecies.org/aphia.php?p=webservice)

SOAP web service
 Read | Soap Service
 Open SOAP interface (AphiaNameService) with published WSDL and worked examples for Excel, PHP, Python, R, MATLAB, Perl and VB.NET. Retained for legacy integrations.
 https://www.marinespecies.org/aphia.php?p=soap
 Source: WoRMS Web Services page

Taxon match tool
 Read | Bulk Match Tool
 Web form for matching a whole species list against WoRMS in one pass, returning accepted names and AphiaIDs. This is the practical route for validating the species lists embedded in notifications, EIA baselines or area proposals.
 https://www.marinespecies.org/aphia.php?p=match
 Source: WoRMS Web Services page

LSID persistent identifiers
 Read | Persistent Identifier
 Every taxon carries a resolvable Life Science Identifier of the form urn:lsid:marinespecies.org:taxname:AphiaID, returning RDF/XML with Darwin Core and Dublin Core metadata. This is the stable join key for linking a species across systems.
 https://www.marinespecies.org/aphia.php?p=webservice
 Source: WoRMS Web Services page

Linked Data Event Stream
 Read | Rdf Event Stream
 RDF event stream of all Aphia records with content negotiation across Turtle, JSON-LD, RDF/XML and N-Triples, plus versioned URIs. Suited to systems that need to track taxonomic changes over time rather than take a snapshot.
 https://aphia.org/feed
 Source: WoRMS Web Services page

Darwin Core Archive export
 Read | Download Portal
 Full WoRMS taxonomic export as a Darwin Core Archive, published through GBIF under CC BY 4.0 with DOI 10.14284/170. Subregister exports are separately available, for example the World Register of Introduced Marine Species.
 https://www.gbif.org/dataset/2d59e5db-57ad-41ff-97d6-11f5fb264527
 Source: GBIF dataset page

Custom database dump
 Read | Request Based Export
 Taxonomic data only, supplied as Darwin Core CSV on application. Requests are assessed by two Steering Committee members plus the Data Management Team, and dumps are refreshed quarterly. Whole-database redistribution is not permitted without prior written agreement.
 https://www.marinespecies.org/usersrequest.php
 Source: WoRMS user request page

worrms R package
 Read | R Package
 rOpenSci client wrapping the REST API for programmatic name matching and taxon retrieval.
 https://docs.ropensci.org/worrms/
 Source: rOpenSci documentation

Write / contribution access

Appointed taxonomic and thematic editors
 Submit | Curated Expert Editing
 The primary write path. Each taxonomic group is assigned to an expert who holds authority over its content and edits directly in Aphia. Chief editors can invite additional specialists. Editors add newly published taxa, correct errors and verify existing records, with changes live the same day. Editors are credited on taxon pages and on the editors list.
 https://www.marinespecies.org/aphia.php?p=editors
 Source: WoRMS About page

Becoming an editor
 Submit | Appointment Request
 Prospective editors contact the Data Management Team or the relevant chief editor. Appointment requires demonstrated taxonomic expertise in the group concerned.
 https://www.marinespecies.org/contribute.php
 Source: WoRMS Contribute page

Public error reports
 Submit | Open Feedback
 Any user can email the Data Management Team or use the contact link on any page to report an error or suggest an addition. The team filters submissions and routes them to the relevant editor. WoRMS commits to following up and giving feedback on reported errors rather than to being error-free.
 https://www.marinespecies.org/contribute.php
 Source: WoRMS Contribute page

Usage

Accepted extant marine species: 250,570 (WoRMS homepage, observed 2026-09-07)
 Marine species names including synonyms: 524,081 (WoRMS homepage, observed 2026-09-07)
 Species with image: 55,262, 82% checked (WoRMS homepage, observed 2026-09-07)
 Percent checked by an editor: 98% (WoRMS homepage, observed 2026-09-07)
 Editors: 371 (WoRMS homepage, observed 2026-09-07)
 Registered institutional users: 428 (WoRMS homepage, observed 2026-09-07)
 Webhits: 300,429,734 in 2025 (WoRMS homepage, observed 2026-09-07)
 New species added per year: over 2,600 marine species described in 2025, including roughly 660 fossil species (WoRMS annual round-up)
 Update cadence: daily editing, monthly archiving, quarterly dump refresh (WoRMS About and user request pages, observed 2026-09-07)

Connections
 Flanders Marine Institute (VLIZ): operates (incoming)
 Aphia platform: hosted on (part of)
 Ocean Biodiversity Information System (OBIS): taxonomic backbone (outgoing)
 GBIF: taxonomic backbone via Catalogue of Life (outgoing)
 Catalogue of Life: supplies Global Species Databases (outgoing)
 EMODnet Biology: taxonomic backbone (outgoing)
 LifeWatch: taxonomic backbone and funding route (bidirectional)
 MolluscaBase: constituent Global Species Database (incoming)
 World Register of Deep-Sea Species (WoRDSS): constituent Thematic Species Database (incoming)
 World Register of Introduced Marine Species (WRiMS): constituent Thematic Species Database (incoming)
 European Register of Marine Species (ERMS): constituent Regional Species Database and predecessor (incoming)
 Clarion-Clipperton Zone Species Checklist: constituent Regional Species Database (incoming)
 FishBase: independent partner database, content exchange (bidirectional)
 AlgaeBase: independent partner database, content exchange (incoming)
 International Seabed Authority: taxonomic standard for DeepData, joint CCZ checklist (bidirectional)
 NCBI GenBank: deep-linked from species pages (outgoing)
