# Relationship review — 9 September 2026

Status: reviewed correction plan; production application and verification pending.

Scope: all 117 canonical PostgreSQL records (60 systems, 51 organizations, 6 country/context records) and all 139 incident relationships, fetched through the authenticated Record API. This is a dated audit, not another canonical registry.

## Contract

| Kind | Allowed direction | Meaning |
|---|---|---|
| `governs` | country/organization → organization/system | Binding institutional or policy authority; scope matters. |
| `operates` | organization → system | Runs, maintains or manages the specified service or programme. |
| `funds` | country/organization → organization/system | Documented financial support; record period and programme when known. |
| `member_of` | country → organization; organization → organization; system → system | Documented membership or participation, never component containment. |
| `publishes_to` | organization → system | Organization deposits or disseminates its data through a system. |
| `syncs_to` | system → system | Documented data transfer, from upstream source to receiving system. |

Multiple relationships can coexist. Membership does not imply unilateral governance; funding does not imply operation. Bidirectional exchange requires two edges. An empty relationship set means no assertion, not proof of independence.

## Findings and correction boundaries

- The 50 old `governs` edges mixed real public authority with location and an invented “International” governor. Retain 7 documented national institutional ties, remove 43 unsupported geographic assertions, and add evidenced governing bodies.
- Remove all 10 `part_of` edges. Re-establish only the three INSDC archive participation relationships as `member_of`; component services remain described in profile prose.
- Replace composite or duplicate operator labels with actual institutions, keeping genuine programme/team organizations. Retire 11 obsolete composite/duplicate organization records and the fake International country; keep their prior identities in this audit and the pre-change backup.
- Correct European Union from country to organization. Country codes identify actual country nodes only.
- Review every data edge. Keep documented preservation and biodiversity feeds, represent reciprocal INSDC exchange explicitly, and reverse ENA → MGnify. Remove speculative federation and reference/display relationships that do not establish synchronization.
- Do not create a current sync merely because a historical method used a dataset, a product catalogue contains Argo products, or two services share infrastructure.
- Funding findings include NSF awards, EU programme support, DFO/MEOPAR coordination funding and scoped Flanders project support. They are not complete funding rosters or claims of exclusive control.

## Limits and follow-up

Every existing node and edge has a disposition below. This review does not establish a complete global member-country or funder census. The graph contains four actual country records; membership edges are partial even where authoritative full rosters exist. Research must still expand those rosters deliberately, distinguish full/associate/observer status, and establish award periods and governance mandates where the reviewed sources are historical.

AlgaeBase, GO-SHIP, OceanSITES, SeaDataNet and Argovis have historical or undated organizational evidence. The reviewed team/programme scope is retained with that limitation; current mandate and funding details remain open. The BBNJ record describes a planned implementation: treaty responsibility does not establish a live implementation operator or data feed.

All existing rich records must pass the new six-relationship assessment and the existing aggregate quality rules before retaining rich status. FishBase and SeaLifeBase lacked that assessment at migration time and require requalification. Existing human review history is preserved and new review states indicate revision is needed. This audit does not claim six-language rich backfills are complete.

## All system records

| Record | Relationship finding | Evidence |
|---|---|---|
| `algaebase` | Research team directed by Michael Guiry; mixed sponsorship is not EU governance. | [AlgaeBase team](https://admin.algaebase.org/team/) |
| `aquamaps` | Collaborative modelling team. The methodological page documents GBIF and OBIS inputs, but does not establish current automated synchronization. | [AquaMaps about](https://aquamaps.org/main/AboutAquaMaps.php) |
| `argo-gdac` | The ADMT coordinates standards; GDAC operation is shared by IFREMER/Coriolis in France and US GODAE in Monterey. | [Argo data system](https://argo.ucsd.edu/organization/argo-data-system/) |
| `argovis` | University research collaboration; a US location does not establish federal governance. Presentation is historical (2024). | [Argovis project presentation](https://argovis.colorado.edu/Argovis_hackathon_S2024_Giglio.pdf) |
| `bco-dmo` | WHOI hosts the office; NSF funds the service under OCE-2421145. Published data are preserved at NCEI. | [About BCO-DMO](https://www.bco-dmo.org/about) |
| `bio-oracle` | International research consortium; VLIZ hosts the website. Team affiliations do not establish member-country control. | [Bio-ORACLE consortium](https://www.bio-oracle.org/) |
| `bismal` | JAMSTEC operates BISMaL and publishes marine biological observations; the Japan OBIS node distributes data to OBIS. | [JAMSTEC databases](https://www.jamstec.go.jp/e/database/) |
| `bold` | BOLD is hosted at the Centre for Biodiversity Genomics, University of Guelph. Canadian location does not establish federal governance. | [BOLD contact](https://boldsystems.org/about/contact/) |
| `cioos` | Federated Canadian observing system supported by Fisheries and Oceans Canada; national coordination and regional operations must not be conflated with sole federal control. | [About CIOOS](https://cioos.ca/about-us/) |
| `cmems-datastore` | Mercator Ocean implements the EU-funded marine service. The Data Store is a component, not a consortium member. Argo product availability alone does not establish a specific GDAC synchronization route. | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `copernicus-marine` | Mercator Ocean implements the marine service with EU funding; the EU is an organization, not a country. | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `datras` | ICES operates the trawl-survey database. Service inclusion within ICES Data is not consortium membership. | [ICES DATRAS](https://datras.ices.dk/) |
| `ddbj` | NIG/ROIS operates DDBJ; participating archive in INSDC with reciprocal sequence exchange. | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `dryad` | Independent nonprofit with member-elected board; US incorporation is not US government control. | [About Dryad](https://datadryad.org/about) |
| `ecotrust-oregon-fisheries-uses-values` | Ecotrust is an independent nonprofit. The fisheries project is not federally governed because it concerns Oregon. | [Ecotrust organization structure](https://ecotrust.org/about/organization-structure/) |
| `emodnet` | EC DG MARE manages the service, funded through EMFAF. Technical delivery involves thematic consortia. | [About EMODnet](https://emodnet.ec.europa.eu/en/about_emodnet) |
| `emodnet-biology` | VLIZ leads coordination, data management and infrastructure for the 2025–2027 consortium. Shared EurOBIS infrastructure and reference vocabularies do not alone prove separate synchronization. | [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) |
| `ena` | EMBL-EBI operates ENA; participating INSDC archive with reciprocal sequence exchange. EMBL is separate from the EU. | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `euro-argo` | ERIC organization with a member-state Council and national contributions; EU location is not EU governance. Statutes dated November 2023. | [Euro-Argo ERIC statutes](https://www.euro-argo.eu/content/download/117406/file/Euro-Argo-ERIC-Statutes-EN-November-2023.pdf) |
| `eurobis` | VLIZ operates EurOBIS, the European OBIS node. LifeWatch support is distinct from technical operation. | [About EurOBIS](https://www.eurobis.org/about) |
| `fao-fishstat` | FAO is an intergovernmental organization with its own governing bodies. International is not a governing country. | [FAO governing bodies](https://www.fao.org/governing-bodies/en) |
| `fishbase` | Q-quatics hosts and manages FishBase. The FishBase Consortium provides scientific advice; this does not by itself establish binding governance. | [FishBase homepage](https://fishbase.se/home.htm) |
| `gbif` | GBIF Secretariat runs the infrastructure for an international network of countries and organizations. Secretariat location is not governing nationality. | [What is GBIF](https://www.gbif.org/what-is-gbif) |
| `gebco-web-services` | GEBCO is a joint IHO/IOC initiative; its web services are supported by the British Oceanographic Data Centre. A programme label is not a sole government. | [About GEBCO](https://www.gebco.net/about-us) |
| `genbank` | NCBI within NLM/NIH operates GenBank; US federal institutional tie coexists with INSDC membership and exchange. | [About NCBI](https://www.ncbi.nlm.nih.gov/home/about/) |
| `geome` | A collaborating research team and steering committee develop and direct GEOME. Institution affiliations are not country membership. | [GEOME documentation](https://geome-db.org/docs/helpDocumentationv4.pdf) |
| `ggbn` | Executive Committee sets strategy and budget; Berlin technical office operates the portal. Current Secretariat is at LIB Bonn, not the former Smithsonian host. | [GGBN governance](https://wiki.ggbn.org/ggbn/Governance) |
| `glodap` | International reference group coordinates the synthesis; release-specific funding must not be presented as permanent exclusive government control. | [GLODAP](https://glodap.info/) |
| `go-ship` | International science committee coordinates nationally executed surveys. Published governance evidence is from 2019; current mandates and funding periods need follow-up. | [GO-SHIP programme paper](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2019.00445/full) |
| `ices-data` | ICES is governed collectively by member countries through its Council, and operates its data services. | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `insdc` | Independent institutional members operate the collaborating archives; Executive and Implementation Committees set common direction and policy. | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `intercatch` | ICES operates InterCatch; it is an ICES service, not a member organization or consortium participant in ICES Data. | [ICES InterCatch](https://www.ices.dk/data/data-portals/Pages/InterCatch.aspx) |
| `ioos` | NOAA coordinates US IOOS with federal and non-federal partners. Operation scope is the programme office, not ownership of every regional data source. | [About US IOOS](https://ioos.noaa.gov/about/about-us/) |
| `marine-regions` | VLIZ manages Marine Regions. Referencing its geography vocabulary is not evidence of a synchronized repository. | [About Marine Regions](https://www.marineregions.org/about.php) |
| `mgnify` | EMBL-EBI operates MGnify. Data flow runs from ENA into MGnify analysis, not the reverse. | [MGnify data flow](https://docs.mgnify.org/src/docs/dataflow.html) |
| `molluscabase` | VLIZ hosts the technical infrastructure; editors curate taxonomy. Taxonomic-backbone use is not automatically synchronization. | [About MolluscaBase](https://molluscabase.org/about.php) |
| `noaa-cetacean-bia` | NOAA coastal-management infrastructure distributes the data; scientific authorship and portal operation are different roles. | [NOAA biologically important areas](https://www.fisheries.noaa.gov/inport/item/23643) |
| `noaa-esi-wa-or-marine-mammals` | NOAA Office of Response and Restoration provides ESI data. Federal operation does not make it sole scientific contributor. | [NOAA ESI maps](https://www.fisheries.noaa.gov/inport/item/55730) |
| `noaa-ncei-marine` | NCEI is a NOAA federal data centre. Archival receipt from BCO-DMO is distinct from BCO-DMO governance. | [NOAA NCEI marine data](https://www.ncei.noaa.gov/products/marine) |
| `oceaninfohub` | IODE/IOC-UNESCO implements the project with Government of Flanders funding. Funding is project-scoped; current continuation terms require confirmation. | [Ocean InfoHub project overview](https://oceaninfohub.org/project-overview/) |
| `oceanops` | Joint WMO/IOC centre managed through the Observations Coordination Group; observing-network contributions do not make France the sole governor. | [WMO marine observations](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/marine-services/marine-observations) |
| `oceansites` | Steering Committee and Data Management Team coordinate distributed observatories; GDACs are at NOAA NDBC and IFREMER. Governance document is historical (2016). | [OceanSITES organization and governance](https://www.ocean-ops.org/oceansites/documents/Organization_and_Governance_17Mar2016.pdf) |
| `odfw-commercial-landings` | Oregon Department of Fish and Wildlife operates the statistics service. It is a state agency, not a federal agency. | [ODFW commercial fishery statistics](https://www.dfw.state.or.us/fish/commercial/statistics.asp) |
| `odis` | IODE coordinates distributed infrastructure under IOC; independent connected systems retain their own governance. | [Ocean Data and Information System](https://oceaninfohub.org/odis/) |
| `ooi-data` | WHOI, Oregon State and University of Washington operate different OOI components under NSF Award 2244833; coordination does not imply a sole operator. | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `openstreetmap-standard-raster-tiles` | OSMF operates the standard tile service. Volunteer map contributors and UK incorporation do not establish UK government control. | [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) |
| `oregon-dlcd-coastal-gis` | Oregon DLCD/OCMP operates coastal GIS services; state authority must not be substituted with US federal governance. | [DLCD maps and data tools](https://www.oregon.gov/lcd/about/pages/maps-data-tools.aspx) |
| `pangaea` | AWI and MARUM jointly host and operate PANGAEA. Mixed institutional support must remain visible instead of one composite German operator. | [About PANGAEA](https://www.pangaea.de/about/) |
| `platform-bbnj-chm` | Article 51 assigns Clearing-House Mechanism management to the Secretariat and modalities to the COP. This planned implementation has no verified live operator or OBIS synchronization. | [BBNJ Agreement](https://www.un.org/bbnjagreement/sites/default/files/2024-08/Text%20of%20the%20Agreement%20in%20English.pdf) |
| `platform-obis` | IODE/IOC-UNESCO coordinates OBIS with independently operated nodes. Node contributions do not imply ownership by one government. | [OBIS governance](https://obis.org/about/governance/) |
| `protomaps-basemap` | Independent Protomaps operation; global OpenStreetMap-derived coverage is not international governmental control. | [About Protomaps](https://protomaps.com/about) |
| `rdbes` | ICES hosts RDBES, with strategic development directed by WGRDBESGOV. It is a service, not a membership child of ICES Data. | [ICES RDBES](https://www.ices.dk/data/data-portals/Pages/rdbes.aspx) |
| `re3data` | KIT and Purdue University Libraries jointly manage and operate re3data; Working Group direction is separate from operation. | [About re3data](https://www.re3data.org/about) |
| `sea-around-us` | Research initiative at UBC and University of Western Australia with charitable support. Canadian-only governance would hide the collaboration. | [About Sea Around Us](https://www.seaaroundus.org/about-2/) |
| `seadatanet` | Distributed consortium of national oceanographic data centres and technical partners. Historical project funding and centre affiliation require scoped statements. | [About SeaDataNet](https://www.seadatanet.org/content/download/733/file/SDN2_D611_WP6_leaflet.pdf) |
| `seadatanet-cdi` | CDI is a common discovery and access service; it is not a separate member institution of SeaDataNet. | [SeaDataNet CDI manual](https://www.seadatanet.org/content/download/599/file/SDN2_D57_TC_UserManualforUpdatingCDI-Data-Access-Service.pdf) |
| `sealifebase` | Q-quatics maintains SeaLifeBase. Embedded AquaMaps maps and MolluscaBase taxonomy do not establish outbound synchronization. | [About SeaLifeBase](https://www.sealifebase.ca/home/who_we_are.php) |
| `socat` | Regional working groups perform quality control, coordinated globally. Workshop sponsors are not automatically current permanent funders. | [About SOCAT](https://socat.info/index.php/about/) |
| `worms` | VLIZ operates infrastructure; the elected Steering Committee has scientific policy authority. Advisory and operational roles are distinct. | [WoRMS terms of reference](https://www.marinespecies.org/documents/MoUs_ToUs/WoRMS_Terms_of_Reference.pdf) |
| `zenodo` | CERN provides and operates Zenodo; OpenAIRE was the founding EC project, not a second current platform operator by implication. | [About Zenodo](https://about.zenodo.org/) |

## All original organization and country records

| Record | Disposition | Evidence / scope |
|---|---|---|
| `algaebase-operator` | Retain identity; review incoming authority and outgoing roles. | See system review: `algaebase` |
| `aquamaps-collaboration` | Retain identity; review incoming authority and outgoing roles. | See system review: `aquamaps` |
| `argo-data-management-team` | Retain identity; review incoming authority and outgoing roles. | See system review: `argo-gdac` |
| `awi-and-marum` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `pangaea` |
| `bio-oracle-team` | Retain identity; review incoming authority and outgoing roles. | See system review: `bio-oracle` |
| `bioinformation-and-ddbj-center-nig` | Retain identity; review incoming authority and outgoing roles. | See system review: `ddbj` |
| `bold-systems` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `bold` |
| `can` | Retain identity; review incoming authority and outgoing roles. | Country identity retained. Review all incident relationships; citizenship, headquarters and geographic coverage do not establish government control. Membership and funding are separately evidenced. |
| `cern-and-openaire` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `zenodo` |
| `cioos-operator` | Retain identity; review incoming authority and outgoing roles. | See system review: `cioos` |
| `copernicus-marine-service` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `cmems-datastore` |
| `deu` | Retain identity; review incoming authority and outgoing roles. | Country identity retained. Review all incident relationships; citizenship, headquarters and geographic coverage do not establish government control. Membership and funding are separately evidenced. |
| `dryad-operator` | Retain identity; review incoming authority and outgoing roles. | See system review: `dryad` |
| `ecotrust` | Retain identity; review incoming authority and outgoing roles. | See system review: `ecotrust-oregon-fisheries-uses-values` |
| `embl-ebi` | Retain identity; review incoming authority and outgoing roles. | See system review: `ena`, `mgnify` |
| `emodnet-biology-consortium` | Retain identity; review incoming authority and outgoing roles. | See system review: `emodnet-biology` |
| `eur` | Correct kind to organization; clear country code. | Correct kind to organization: the European Union is not a country. Remove inherited location-based governance; retain only documented programme funding. |
| `euro-argo-eric` | Retain identity; review incoming authority and outgoing roles. | See system review: `euro-argo` |
| `european-commission-and-thematic-consortia` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `emodnet` |
| `fao` | Retain identity; review incoming authority and outgoing roles. | See system review: `fao-fishstat` |
| `fishbase-consortium` | Retain identity; review incoming authority and outgoing roles. | Scientific advisory body described by FishBase; advisory status alone does not establish binding governance. No governs edge asserted. |
| `flanders-marine-institute` | Retain identity; review incoming authority and outgoing roles. | See system review: `marine-regions`, `worms` |
| `gbif-secretariat` | Retain identity; review incoming authority and outgoing roles. | See system review: `gbif` |
| `gebco` | Retain identity; review incoming authority and outgoing roles. | See system review: `gebco-web-services` |
| `geome-collaboration` | Retain identity; review incoming authority and outgoing roles. | See system review: `geome` |
| `ggbn-consortium` | Retain identity; review incoming authority and outgoing roles. | See system review: `ggbn` |
| `glodap-community` | Retain identity; review incoming authority and outgoing roles. | See system review: `glodap` |
| `ices` | Retain identity; review incoming authority and outgoing roles. | See system review: `datras`, `ices-data`, `intercatch`, `rdbes` |
| `insdc-members` | Retain identity; review incoming authority and outgoing roles. | See system review: `insdc` |
| `int` | Retire obsolete grouping/composite; replace with evidenced actors. | Retire the International grouping node and all its governs edges. It is neither a country nor a real governing organization. |
| `international-go-ship-community` | Retain identity; review incoming authority and outgoing roles. | See system review: `go-ship` |
| `ioc-unesco-iode` | Retain identity; review incoming authority and outgoing roles. | See system review: `platform-obis`, `odis`, `oceaninfohub` |
| `jamstec` | Retain identity; review incoming authority and outgoing roles. | See system review: `bismal` |
| `jpn` | Retain identity; review incoming authority and outgoing roles. | Country identity retained. Review all incident relationships; citizenship, headquarters and geographic coverage do not establish government control. Membership and funding are separately evidenced. |
| `mercator-ocean-international-and-eu` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `copernicus-marine` |
| `molluscabase-editors-and-vliz` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `molluscabase` |
| `ncbi-united-states` | Retain identity; review incoming authority and outgoing roles. | See system review: `genbank` |
| `noaa-ioos` | Retain identity; review incoming authority and outgoing roles. | See system review: `ioos` |
| `noaa-ncei` | Retain identity; review incoming authority and outgoing roles. | See system review: `noaa-ncei-marine` |
| `noaa-office-for-coastal-management` | Retain identity; review incoming authority and outgoing roles. | See system review: `noaa-cetacean-bia` |
| `noaa-office-of-response-and-restoration` | Retain identity; review incoming authority and outgoing roles. | See system review: `noaa-esi-wa-or-marine-mammals` |
| `ocean-observatories-initiative` | Retain identity; review incoming authority and outgoing roles. | See system review: `ooi-data` |
| `oceansites-programme` | Retain identity; review incoming authority and outgoing roles. | See system review: `oceansites` |
| `openstreetmap-foundation` | Retain identity; review incoming authority and outgoing roles. | See system review: `openstreetmap-standard-raster-tiles` |
| `oregon-department-of-fish-and-wildlife` | Retain identity; review incoming authority and outgoing roles. | See system review: `odfw-commercial-landings` |
| `oregon-dlcd` | Retain identity; review incoming authority and outgoing roles. | See system review: `oregon-dlcd-coastal-gis` |
| `protomaps` | Retain identity; review incoming authority and outgoing roles. | See system review: `protomaps-basemap` |
| `q-quatics` | Retain identity; review incoming authority and outgoing roles. | See system review: `fishbase`, `sealifebase` |
| `re3data-consortium` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `re3data` |
| `sea-around-us-operator` | Retain identity; review incoming authority and outgoing roles. | See system review: `sea-around-us` |
| `seadatanet-consortium` | Retain identity; review incoming authority and outgoing roles. | See system review: `seadatanet`, `seadatanet-cdi` |
| `socat-community` | Retain identity; review incoming authority and outgoing roles. | See system review: `socat` |
| `university-of-colorado-boulder-and-collaborators` | Retain identity; review incoming authority and outgoing roles. | See system review: `argovis` |
| `usa` | Retain identity; review incoming authority and outgoing roles. | Country identity retained. Review all incident relationships; citizenship, headquarters and geographic coverage do not establish government control. Membership and funding are separately evidenced. |
| `vliz-and-lifewatch-belgium` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `eurobis` |
| `whoi-and-partner-institutions` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `bco-dmo` |
| `wmo-and-ioc-unesco` | Retire obsolete grouping/composite; replace with evidenced actors. | See system review: `oceanops` |

## Every original edge

Retained edges receive source references and scoped notes. Removed edge IDs remain here for traceability. Replacement edges are listed in the final inventory section.

| Original edge | Original relationship | Decision |
|---|---|---|
| `link-aquamaps-gbif` | `aquamaps → syncs_to → gbif` | No current synchronization established: AquaMaps uses occurrence records from GBIF as part of its modelling inputs Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-aquamaps-obis` | `aquamaps → syncs_to → platform-obis` | No current synchronization established: AquaMaps uses occurrence records from OBIS as part of its modelling inputs Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-bcodmo-ncei` | `bco-dmo → syncs_to → noaa-ncei-marine` | Retain with primary evidence and scope. |
| `link-cmems-argo` | `cmems-datastore → syncs_to → argo-gdac` | No current synchronization established: Copernicus Marine distributes Argo data products through the Data Store Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-ddbj-ena` | `ddbj → syncs_to → ena` | Retain with primary evidence and scope. |
| `link-ddbj-genbank` | `ddbj → syncs_to → genbank` | Retain with primary evidence and scope. |
| `link-emodnet-biology-eurobis` | `emodnet-biology → syncs_to → eurobis` | No current synchronization established: EMODnet Biology lists international biogeographic datasets from EurOBIS as core contributors and describes its data infrastructure as that of EurOBIS Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-emodnet-biology-marine-regions` | `emodnet-biology → syncs_to → marine-regions` | No current synchronization established: EMODnet Biology lists Marine Regions among the standards and vocabularies it implements Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-emodnet-biology-seadatanet-cdi` | `emodnet-biology → syncs_to → seadatanet-cdi` | No current synchronization established: EMODnet Biology periodically harvests biodiversity datasets from CDI Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-emodnet-biology-worms` | `emodnet-biology → syncs_to → worms` | No current synchronization established: EMODnet Biology references scientificNameID against WoRMS for accepted taxonomy Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-ena-genbank` | `ena → syncs_to → genbank` | Retain with primary evidence and scope. |
| `link-eurobis-obis` | `eurobis → syncs_to → platform-obis` | Retain with primary evidence and scope. |
| `link-mgnify-ena` | `mgnify → syncs_to → ena` | Direction reversed: ENA data are retrieved for MGnify analysis. |
| `link-obis-molluscabase` | `platform-obis → syncs_to → molluscabase` | No current synchronization established: MolluscaBase states that it serves as taxonomic backbone for OBIS Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-obis-worms` | `platform-obis → syncs_to → worms` | No current synchronization established: OBIS attaches taxonomic information from WoRMS into datasets Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-sealifebase-aquamaps` | `sealifebase → syncs_to → aquamaps` | No current synchronization established: SeaLifeBase maps are provided using AquaMaps Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `link-sealifebase-molluscabase` | `sealifebase → syncs_to → molluscabase` | No current synchronization established: MolluscaBase states that it serves as taxonomic backbone for SeaLifeBase Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `rel-algaebase-operates-algaebase` | `algaebase-operator → operates → algaebase` | Retain with primary evidence and scope. |
| `rel-algaebase-part-of-eur` | `eur → governs → algaebase-operator` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-aquamaps-collaboration-operates-aquamaps` | `aquamaps-collaboration → operates → aquamaps` | Retain with primary evidence and scope. |
| `rel-aquamaps-collaboration-part-of-int` | `int → governs → aquamaps-collaboration` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-argo-data-management-team-operates-argo-global-data-assembly-centers` | `argo-data-management-team → operates → argo-gdac` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-argo-data-management-team-part-of-int` | `int → governs → argo-data-management-team` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-awi-and-marum-operates-pangaea` | `awi-and-marum → operates → pangaea` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-awi-and-marum-part-of-deu` | `deu → governs → awi-and-marum` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-bio-oracle-team-operates-bio-oracle` | `bio-oracle-team → operates → bio-oracle` | Retain with primary evidence and scope. |
| `rel-bio-oracle-team-part-of-eur` | `eur → governs → bio-oracle-team` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-bioinformation-and-ddbj-center-nig-operates-dna-data-bank-of-japan` | `bioinformation-and-ddbj-center-nig → operates → ddbj` | Retain with primary evidence and scope. |
| `rel-bioinformation-and-ddbj-center-nig-part-of-jpn` | `jpn → governs → bioinformation-and-ddbj-center-nig` | Retain with primary evidence and scope. |
| `rel-bismal-syncs-to-obis` | `bismal → syncs_to → platform-obis` | Retain with primary evidence and scope. |
| `rel-bold-systems-operates-barcode-of-life-data-system` | `bold-systems → operates → bold` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-bold-systems-part-of-can` | `can → governs → bold-systems` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-cern-and-openaire-operates-zenodo` | `cern-and-openaire → operates → zenodo` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-cern-and-openaire-part-of-eur` | `eur → governs → cern-and-openaire` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-cioos-operates-canadian-integrated-ocean-observing-system` | `cioos-operator → operates → cioos` | Retain with primary evidence and scope. |
| `rel-cioos-part-of-can` | `can → governs → cioos-operator` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-cmems-datastore-part-of-copernicus-marine` | `cmems-datastore → part_of → copernicus-marine` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-copernicus-marine-service-operates-copernicus-marine-data-store` | `copernicus-marine-service → operates → cmems-datastore` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-copernicus-marine-service-part-of-eur` | `eur → governs → copernicus-marine-service` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-datras-part-of-ices-data` | `datras → part_of → ices-data` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-ddbj-part-of-insdc` | `ddbj → part_of → insdc` | Participating INSDC archive: replace with member_of. |
| `rel-dryad-operates-dryad` | `dryad-operator → operates → dryad` | Retain with primary evidence and scope. |
| `rel-dryad-part-of-usa` | `usa → governs → dryad-operator` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-ecotrust-operates-ecotrust-oregon-fisheries-uses-values` | `ecotrust → operates → ecotrust-oregon-fisheries-uses-values` | Retain with primary evidence and scope. |
| `rel-embl-ebi-operates-european-nucleotide-archive` | `embl-ebi → operates → ena` | Retain with primary evidence and scope. |
| `rel-embl-ebi-operates-mgnify` | `embl-ebi → operates → mgnify` | Retain with primary evidence and scope. |
| `rel-embl-ebi-part-of-eur` | `eur → governs → embl-ebi` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-emodnet-biology-consortium-operates-emodnet-biology` | `emodnet-biology-consortium → operates → emodnet-biology` | Retain with primary evidence and scope. |
| `rel-emodnet-biology-consortium-part-of-eur` | `eur → governs → emodnet-biology-consortium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-emodnet-biology-part-of-emodnet` | `emodnet-biology → part_of → emodnet` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-ena-part-of-insdc` | `ena → part_of → insdc` | Participating INSDC archive: replace with member_of. |
| `rel-euro-argo-eric-operates-euro-argo-eric` | `euro-argo-eric → operates → euro-argo` | Retain with primary evidence and scope. |
| `rel-euro-argo-eric-part-of-eur` | `eur → governs → euro-argo-eric` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-eurobis-part-of-emodnet-biology` | `eurobis → part_of → emodnet-biology` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-european-commission-and-thematic-consortia-operates-european-marine-observation-and-data-network` | `european-commission-and-thematic-consortia → operates → emodnet` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-european-commission-and-thematic-consortia-part-of-eur` | `eur → governs → european-commission-and-thematic-consortia` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-fao-operates-fao-fishstat-and-fishery-statistics` | `fao → operates → fao-fishstat` | Retain with primary evidence and scope. |
| `rel-fao-part-of-int` | `int → governs → fao` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-fishbase-consortium-part-of-int` | `int → governs → fishbase-consortium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-flanders-marine-institute-operates-marine-regions` | `flanders-marine-institute → operates → marine-regions` | Retain with primary evidence and scope. |
| `rel-flanders-marine-institute-operates-world-register-of-marine-species` | `flanders-marine-institute → operates → worms` | Retain with primary evidence and scope. |
| `rel-flanders-marine-institute-part-of-int` | `int → governs → flanders-marine-institute` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-gbif-secretariat-operates-global-biodiversity-information-facility` | `gbif-secretariat → operates → gbif` | Retain with primary evidence and scope. |
| `rel-gbif-secretariat-part-of-int` | `int → governs → gbif-secretariat` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-gebco-operates-gebco-web-services` | `gebco → operates → gebco-web-services` | Retain with primary evidence and scope. |
| `rel-gebco-part-of-int` | `int → governs → gebco` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-genbank-part-of-insdc` | `genbank → part_of → insdc` | Participating INSDC archive: replace with member_of. |
| `rel-geome-collaboration-operates-genomic-observatories-metadatabase` | `geome-collaboration → operates → geome` | Retain with primary evidence and scope. |
| `rel-geome-collaboration-part-of-usa` | `usa → governs → geome-collaboration` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-ggbn-consortium-operates-global-genome-biodiversity-network` | `ggbn-consortium → operates → ggbn` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-ggbn-consortium-part-of-int` | `int → governs → ggbn-consortium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-glodap-community-operates-global-ocean-data-analysis-project` | `glodap-community → operates → glodap` | Retain with primary evidence and scope. |
| `rel-glodap-community-part-of-int` | `int → governs → glodap-community` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-ices-operates-datras` | `ices → operates → datras` | Retain with primary evidence and scope. |
| `rel-ices-operates-ices-marine-data` | `ices → operates → ices-data` | Retain with primary evidence and scope. |
| `rel-ices-operates-intercatch` | `ices → operates → intercatch` | Retain with primary evidence and scope. |
| `rel-ices-operates-regional-database-and-estimation-system` | `ices → operates → rdbes` | Retain with primary evidence and scope. |
| `rel-ices-part-of-int` | `int → governs → ices` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-insdc-members-operates-international-nucleotide-sequence-database-collaboration` | `insdc-members → operates → insdc` | Retain with primary evidence and scope. |
| `rel-insdc-members-part-of-int` | `int → governs → insdc-members` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-intercatch-part-of-ices-data` | `intercatch → part_of → ices-data` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-international-go-ship-community-operates-global-ocean-ship-based-hydrographic-investigations-program` | `international-go-ship-community → operates → go-ship` | Retain with primary evidence and scope. |
| `rel-international-go-ship-community-part-of-int` | `int → governs → international-go-ship-community` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-ioc-unesco-iode-operates-ocean-biodiversity-information-system` | `ioc-unesco-iode → operates → platform-obis` | Retain with primary evidence and scope. |
| `rel-ioc-unesco-iode-operates-ocean-data-and-information-system` | `ioc-unesco-iode → operates → odis` | Retain with primary evidence and scope. |
| `rel-ioc-unesco-iode-operates-ocean-infohub` | `ioc-unesco-iode → operates → oceaninfohub` | Retain with primary evidence and scope. |
| `rel-ioc-unesco-iode-part-of-int` | `int → governs → ioc-unesco-iode` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-jamstec-operates-bismal` | `jamstec → operates → bismal` | Retain with primary evidence and scope. |
| `rel-jamstec-part-of-japan` | `jpn → governs → jamstec` | Retain with primary evidence and scope. |
| `rel-jamstec-publishes-to-bismal` | `jamstec → publishes_to → bismal` | Retain with primary evidence and scope. |
| `rel-mercator-ocean-international-and-eu-operates-copernicus-marine-service` | `mercator-ocean-international-and-eu → operates → copernicus-marine` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-mercator-ocean-international-and-eu-part-of-eur` | `eur → governs → mercator-ocean-international-and-eu` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-molluscabase-editors-and-vliz-operates-molluscabase` | `molluscabase-editors-and-vliz → operates → molluscabase` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-molluscabase-editors-and-vliz-part-of-eur` | `eur → governs → molluscabase-editors-and-vliz` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-ncbi-united-states-operates-genbank` | `ncbi-united-states → operates → genbank` | Retain with primary evidence and scope. |
| `rel-ncbi-united-states-part-of-usa` | `usa → governs → ncbi-united-states` | Retain with primary evidence and scope. |
| `rel-noaa-ioos-operates-u-s-integrated-ocean-observing-system` | `noaa-ioos → operates → ioos` | Retain with primary evidence and scope. |
| `rel-noaa-ioos-part-of-usa` | `usa → governs → noaa-ioos` | Retain with primary evidence and scope. |
| `rel-noaa-ncei-operates-noaa-ncei-marine-data` | `noaa-ncei → operates → noaa-ncei-marine` | Retain with primary evidence and scope. |
| `rel-noaa-ncei-part-of-usa` | `usa → governs → noaa-ncei` | Retain with primary evidence and scope. |
| `rel-noaa-office-for-coastal-management-operates-noaa-cetacean-bia` | `noaa-office-for-coastal-management → operates → noaa-cetacean-bia` | Retain with primary evidence and scope. |
| `rel-noaa-office-of-response-and-restoration-operates-noaa-esi-wa-or-marine-mammals` | `noaa-office-of-response-and-restoration → operates → noaa-esi-wa-or-marine-mammals` | Retain with primary evidence and scope. |
| `rel-obis-syncs-to-chm` | `platform-obis → syncs_to → platform-bbnj-chm` | No current synchronization established: OBIS is a likely downstream synchronization source for the planned CHM. Reference use, embedded display, product availability, shared infrastructure or planned federation alone is insufficient. |
| `rel-ocean-observatories-initiative-operates-ocean-observatories-initiative-data-portal` | `ocean-observatories-initiative → operates → ooi-data` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-ocean-observatories-initiative-part-of-usa` | `usa → governs → ocean-observatories-initiative` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-oceansites-programme-operates-oceansites` | `oceansites-programme → operates → oceansites` | Retain with primary evidence and scope. |
| `rel-oceansites-programme-part-of-int` | `int → governs → oceansites-programme` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-openstreetmap-foundation-operates-standard-raster-tiles` | `openstreetmap-foundation → operates → openstreetmap-standard-raster-tiles` | Retain with primary evidence and scope. |
| `rel-oregon-department-of-fish-and-wildlife-operates-odfw-commercial-landings` | `oregon-department-of-fish-and-wildlife → operates → odfw-commercial-landings` | Retain with primary evidence and scope. |
| `rel-oregon-dlcd-operates-oregon-dlcd-coastal-gis` | `oregon-dlcd → operates → oregon-dlcd-coastal-gis` | Retain with primary evidence and scope. |
| `rel-oregon-dlcd-part-of-usa` | `usa → governs → oregon-dlcd` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-protomaps-operates-protomaps-basemap` | `protomaps → operates → protomaps-basemap` | Retain with primary evidence and scope. |
| `rel-protomaps-part-of-int` | `int → governs → protomaps` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-q-quatics-operates-fishbase` | `q-quatics → operates → fishbase` | Retain with primary evidence and scope. |
| `rel-q-quatics-operates-sealifebase` | `q-quatics → operates → sealifebase` | Retain with primary evidence and scope. |
| `rel-q-quatics-part-of-int` | `int → governs → q-quatics` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-rdbes-part-of-ices-data` | `rdbes → part_of → ices-data` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-re3data-consortium-operates-re3data` | `re3data-consortium → operates → re3data` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-re3data-consortium-part-of-deu` | `deu → governs → re3data-consortium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-sea-around-us-operates-sea-around-us` | `sea-around-us-operator → operates → sea-around-us` | Retain with primary evidence and scope. |
| `rel-sea-around-us-part-of-can` | `can → governs → sea-around-us-operator` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-seadatanet-cdi-part-of-seadatanet` | `seadatanet-cdi → part_of → seadatanet` | Component or shared infrastructure; not membership. Preserve service context in the record prose. |
| `rel-seadatanet-consortium-operates-seadatanet` | `seadatanet-consortium → operates → seadatanet` | Retain with primary evidence and scope. |
| `rel-seadatanet-consortium-operates-seadatanet-common-data-index` | `seadatanet-consortium → operates → seadatanet-cdi` | Retain with primary evidence and scope. |
| `rel-seadatanet-consortium-part-of-eur` | `eur → governs → seadatanet-consortium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-socat-community-operates-surface-ocean-co2-atlas` | `socat-community → operates → socat` | Retain with primary evidence and scope. |
| `rel-socat-community-part-of-int` | `int → governs → socat-community` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-university-of-colorado-boulder-and-collaborators-operates-argovis` | `university-of-colorado-boulder-and-collaborators → operates → argovis` | Retain with primary evidence and scope. |
| `rel-university-of-colorado-boulder-and-collaborators-part-of-usa` | `usa → governs → university-of-colorado-boulder-and-collaborators` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-usa-governs-ecotrust` | `usa → governs → ecotrust` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-usa-governs-noaa-office-for-coastal-management` | `usa → governs → noaa-office-for-coastal-management` | Retain with primary evidence and scope. |
| `rel-usa-governs-noaa-office-of-response-and-restoration` | `usa → governs → noaa-office-of-response-and-restoration` | Retain with primary evidence and scope. |
| `rel-usa-governs-oregon-department-of-fish-and-wildlife` | `usa → governs → oregon-department-of-fish-and-wildlife` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-vliz-and-lifewatch-belgium-operates-european-ocean-biodiversity-information-system` | `vliz-and-lifewatch-belgium → operates → eurobis` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-vliz-and-lifewatch-belgium-part-of-eur` | `eur → governs → vliz-and-lifewatch-belgium` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-whoi-and-partner-institutions-operates-bco-dmo` | `whoi-and-partner-institutions → operates → bco-dmo` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-whoi-and-partner-institutions-part-of-usa` | `usa → governs → whoi-and-partner-institutions` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |
| `rel-wmo-and-ioc-unesco-operates-oceanops` | `wmo-and-ioc-unesco → operates → oceanops` | Replace composite, service-duplicate, or coordinating operator with evidenced operating institutions. |
| `rel-wmo-and-ioc-unesco-part-of-int` | `int → governs → wmo-and-ioc-unesco` | Geographic or international grouping does not establish governing authority; replace only with separately evidenced roles. |

## New organization identities

| ID | Organization | Evidence |
|---|---|---|
| `awi` | Alfred Wegener Institute | [About PANGAEA](https://www.pangaea.de/about/) |
| `centre-for-biodiversity-genomics` | Centre for Biodiversity Genomics, University of Guelph | [BOLD contact](https://boldsystems.org/about/contact/) |
| `cern` | CERN | [About Zenodo](https://about.zenodo.org/) |
| `ec-dg-mare` | European Commission DG MARE | [About EMODnet](https://emodnet.ec.europa.eu/en/about_emodnet) |
| `embl` | European Molecular Biology Laboratory | [EMBL governance](https://www.embl.org/governance/) |
| `embl-council` | EMBL Council | [EMBL governance](https://www.embl.org/governance/) |
| `fisheries-and-oceans-canada` | Fisheries and Oceans Canada | [About CIOOS](https://cioos.ca/about-us/) |
| `ggbn-executive-committee` | GGBN Executive Committee | [GGBN governance](https://wiki.ggbn.org/ggbn/Governance) |
| `ggbn-technical-office` | GGBN Technical Management Office, Botanic Garden Berlin | [GGBN governance](https://wiki.ggbn.org/ggbn/Governance) |
| `government-of-flanders` | Government of Flanders | [Ocean InfoHub project overview](https://oceaninfohub.org/project-overview/) |
| `ices-council` | ICES Council | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `ifremer` | IFREMER | [Argo data system](https://argo.ucsd.edu/organization/argo-data-system/) |
| `insdc-executive-committee` | INSDC Executive Committee | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `insdc-implementation-committee` | INSDC Implementation Committee | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ioc-assembly` | IOC Assembly | [OBIS governance](https://obis.org/about/governance/) |
| `kit` | Karlsruhe Institute of Technology | [About re3data](https://www.re3data.org/about) |
| `marum` | MARUM, University of Bremen | [About PANGAEA](https://www.pangaea.de/about/) |
| `meopar` | Marine Environmental Observation, Prediction and Response Network | [About CIOOS](https://cioos.ca/about-us/) |
| `mercator-ocean-international` | Mercator Ocean International | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `nsf` | US National Science Foundation | [About the US National Science Foundation](https://www.nsf.gov/about) |
| `observations-coordination-group` | GOOS Observations Coordination Group | [WMO marine observations](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/marine-services/marine-observations) |
| `oceanops-centre` | OceanOPS coordination centre | [WMO marine observations](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/marine-services/marine-observations) |
| `oregon-government` | State of Oregon government | [Oregon Governor](https://www.oregon.gov/gov/Pages/default.aspx) |
| `oregon-state-university` | Oregon State University | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `purdue-university-libraries` | Purdue University Libraries | [About re3data](https://www.re3data.org/about) |
| `university-of-washington` | University of Washington | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `us-godae` | US GODAE GDAC | [Argo data system](https://argo.ucsd.edu/organization/argo-data-system/) |
| `whoi` | Woods Hole Oceanographic Institution | [About BCO-DMO](https://www.bco-dmo.org/about) |
| `worms-steering-committee` | WoRMS Steering Committee | [WoRMS terms of reference](https://www.marinespecies.org/documents/MoUs_ToUs/WoRMS_Terms_of_Reference.pdf) |

## Reviewed final edge inventory

Expected after applying this plan: 134 nodes (60 systems, 70 organizations, 4 countries), 117 edges (66 operates, 20 governs, 10 funds, 10 member_of, 10 syncs_to, 1 publishes_to).

| Relationship | Source |
|---|---|
| `deu → funds → embl` | [EMBL member states](https://www.embl.org/about/member-states/) |
| `eur → funds → cmems-datastore` | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `eur → funds → copernicus-marine` | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `eur → funds → emodnet` | [About EMODnet](https://emodnet.ec.europa.eu/en/about_emodnet) |
| `eur → funds → emodnet-biology` | [About EMODnet](https://emodnet.ec.europa.eu/en/about_emodnet) |
| `fisheries-and-oceans-canada → funds → cioos` | [About CIOOS](https://cioos.ca/about-us/) |
| `government-of-flanders → funds → oceaninfohub` | [Ocean InfoHub project overview](https://oceaninfohub.org/project-overview/) |
| `meopar → funds → cioos` | [About CIOOS](https://cioos.ca/about-us/) |
| `nsf → funds → bco-dmo` | [About BCO-DMO](https://www.bco-dmo.org/about) |
| `nsf → funds → ooi-data` | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `can → governs → fisheries-and-oceans-canada` | [About CIOOS](https://cioos.ca/about-us/) |
| `embl → governs → embl-ebi` | [EMBL-EBI leadership](https://www.ebi.ac.uk/about/leadership/) |
| `embl-council → governs → embl` | [EMBL governance](https://www.embl.org/governance/) |
| `ggbn-executive-committee → governs → ggbn-consortium` | [GGBN governance](https://wiki.ggbn.org/ggbn/Governance) |
| `ices-council → governs → ices` | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `insdc-executive-committee → governs → insdc-members` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `insdc-implementation-committee → governs → insdc-members` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ioc-assembly → governs → ioc-unesco-iode` | [OBIS governance](https://obis.org/about/governance/) |
| `jpn → governs → bioinformation-and-ddbj-center-nig` | [About DDBJ / NIG](https://www.ddbj.nig.ac.jp/about/index-e.html) |
| `jpn → governs → jamstec` | [About JAMSTEC](https://www.jamstec.go.jp/e/about/) |
| `observations-coordination-group → governs → oceanops-centre` | [WMO marine observations](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/marine-services/marine-observations) |
| `oregon-government → governs → oregon-department-of-fish-and-wildlife` | [ODFW commercial fishery statistics](https://www.dfw.state.or.us/fish/commercial/statistics.asp) |
| `oregon-government → governs → oregon-dlcd` | [DLCD maps and data tools](https://www.oregon.gov/lcd/about/pages/maps-data-tools.aspx) |
| `usa → governs → ncbi-united-states` | [About NCBI](https://www.ncbi.nlm.nih.gov/home/about/) |
| `usa → governs → noaa-ioos` | [About US IOOS](https://ioos.noaa.gov/about/about-us/) |
| `usa → governs → noaa-ncei` | [NOAA NCEI marine data](https://www.ncei.noaa.gov/products/marine) |
| `usa → governs → noaa-office-for-coastal-management` | [NOAA biologically important areas](https://www.fisheries.noaa.gov/inport/item/23643) |
| `usa → governs → noaa-office-of-response-and-restoration` | [NOAA ESI maps](https://www.fisheries.noaa.gov/inport/item/55730) |
| `usa → governs → nsf` | [About the US National Science Foundation](https://www.nsf.gov/about) |
| `worms-steering-committee → governs → worms` | [WoRMS terms of reference](https://www.marinespecies.org/documents/MoUs_ToUs/WoRMS_Terms_of_Reference.pdf) |
| `bioinformation-and-ddbj-center-nig → member_of → insdc-members` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `can → member_of → ices` | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `ddbj → member_of → insdc` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `deu → member_of → embl` | [EMBL member states](https://www.embl.org/about/member-states/) |
| `deu → member_of → ices` | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `embl-ebi → member_of → insdc-members` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ena → member_of → insdc` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `genbank → member_of → insdc` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ncbi-united-states → member_of → insdc-members` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `usa → member_of → ices` | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `algaebase-operator → operates → algaebase` | [AlgaeBase team](https://admin.algaebase.org/team/) |
| `aquamaps-collaboration → operates → aquamaps` | [AquaMaps about](https://aquamaps.org/main/AboutAquaMaps.php) |
| `awi → operates → pangaea` | [About PANGAEA](https://www.pangaea.de/about/) |
| `bio-oracle-team → operates → bio-oracle` | [Bio-ORACLE consortium](https://www.bio-oracle.org/) |
| `bioinformation-and-ddbj-center-nig → operates → ddbj` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `centre-for-biodiversity-genomics → operates → bold` | [BOLD contact](https://boldsystems.org/about/contact/) |
| `cern → operates → zenodo` | [About Zenodo](https://about.zenodo.org/) |
| `cioos-operator → operates → cioos` | [About CIOOS](https://cioos.ca/about-us/) |
| `dryad-operator → operates → dryad` | [About Dryad](https://datadryad.org/about) |
| `ec-dg-mare → operates → emodnet` | [About EMODnet](https://emodnet.ec.europa.eu/en/about_emodnet) |
| `ecotrust → operates → ecotrust-oregon-fisheries-uses-values` | [Ecotrust organization structure](https://ecotrust.org/about/organization-structure/) |
| `embl-ebi → operates → ena` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `embl-ebi → operates → mgnify` | [MGnify data flow](https://docs.mgnify.org/src/docs/dataflow.html) |
| `emodnet-biology-consortium → operates → emodnet-biology` | [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) |
| `euro-argo-eric → operates → euro-argo` | [Euro-Argo ERIC statutes](https://www.euro-argo.eu/content/download/117406/file/Euro-Argo-ERIC-Statutes-EN-November-2023.pdf) |
| `fao → operates → fao-fishstat` | [FAO governing bodies](https://www.fao.org/governing-bodies/en) |
| `flanders-marine-institute → operates → emodnet-biology` | [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) |
| `flanders-marine-institute → operates → eurobis` | [About EurOBIS](https://www.eurobis.org/about) |
| `flanders-marine-institute → operates → marine-regions` | [About Marine Regions](https://www.marineregions.org/about.php) |
| `flanders-marine-institute → operates → molluscabase` | [About MolluscaBase](https://molluscabase.org/about.php) |
| `flanders-marine-institute → operates → worms` | [WoRMS terms of reference](https://www.marinespecies.org/documents/MoUs_ToUs/WoRMS_Terms_of_Reference.pdf) |
| `gbif-secretariat → operates → gbif` | [What is GBIF](https://www.gbif.org/what-is-gbif) |
| `gebco → operates → gebco-web-services` | [About GEBCO](https://www.gebco.net/about-us) |
| `geome-collaboration → operates → geome` | [GEOME documentation](https://geome-db.org/docs/helpDocumentationv4.pdf) |
| `ggbn-technical-office → operates → ggbn` | [GGBN governance](https://wiki.ggbn.org/ggbn/Governance) |
| `glodap-community → operates → glodap` | [GLODAP](https://glodap.info/) |
| `ices → operates → datras` | [ICES DATRAS](https://datras.ices.dk/) |
| `ices → operates → ices-data` | [ICES member countries](https://www.ices.dk/about-ICES/who-we-are/Pages/Member-Countries.aspx) |
| `ices → operates → intercatch` | [ICES InterCatch](https://www.ices.dk/data/data-portals/Pages/InterCatch.aspx) |
| `ices → operates → rdbes` | [ICES RDBES](https://www.ices.dk/data/data-portals/Pages/rdbes.aspx) |
| `ifremer → operates → argo-gdac` | [Argo data system](https://argo.ucsd.edu/organization/argo-data-system/) |
| `insdc-members → operates → insdc` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `international-go-ship-community → operates → go-ship` | [GO-SHIP programme paper](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2019.00445/full) |
| `ioc-unesco-iode → operates → oceaninfohub` | [Ocean InfoHub project overview](https://oceaninfohub.org/project-overview/) |
| `ioc-unesco-iode → operates → odis` | [Ocean Data and Information System](https://oceaninfohub.org/odis/) |
| `ioc-unesco-iode → operates → platform-obis` | [OBIS governance](https://obis.org/about/governance/) |
| `jamstec → operates → bismal` | [JAMSTEC databases](https://www.jamstec.go.jp/e/database/) |
| `kit → operates → re3data` | [About re3data](https://www.re3data.org/about) |
| `marum → operates → pangaea` | [About PANGAEA](https://www.pangaea.de/about/) |
| `meopar → operates → cioos` | [About CIOOS](https://cioos.ca/about-us/) |
| `mercator-ocean-international → operates → cmems-datastore` | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `mercator-ocean-international → operates → copernicus-marine` | [Copernicus Marine service](https://www.copernicus.eu/en/copernicus-services/marine) |
| `ncbi-united-states → operates → genbank` | [About NCBI](https://www.ncbi.nlm.nih.gov/home/about/) |
| `noaa-ioos → operates → ioos` | [About US IOOS](https://ioos.noaa.gov/about/about-us/) |
| `noaa-ncei → operates → noaa-ncei-marine` | [NOAA NCEI marine data](https://www.ncei.noaa.gov/products/marine) |
| `noaa-office-for-coastal-management → operates → noaa-cetacean-bia` | [NOAA biologically important areas](https://www.fisheries.noaa.gov/inport/item/23643) |
| `noaa-office-of-response-and-restoration → operates → noaa-esi-wa-or-marine-mammals` | [NOAA ESI maps](https://www.fisheries.noaa.gov/inport/item/55730) |
| `oceanops-centre → operates → oceanops` | [WMO marine observations](https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/marine-services/marine-observations) |
| `oceansites-programme → operates → oceansites` | [OceanSITES organization and governance](https://www.ocean-ops.org/oceansites/documents/Organization_and_Governance_17Mar2016.pdf) |
| `openstreetmap-foundation → operates → openstreetmap-standard-raster-tiles` | [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) |
| `oregon-department-of-fish-and-wildlife → operates → odfw-commercial-landings` | [ODFW commercial fishery statistics](https://www.dfw.state.or.us/fish/commercial/statistics.asp) |
| `oregon-dlcd → operates → oregon-dlcd-coastal-gis` | [DLCD maps and data tools](https://www.oregon.gov/lcd/about/pages/maps-data-tools.aspx) |
| `oregon-state-university → operates → ooi-data` | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `protomaps → operates → protomaps-basemap` | [About Protomaps](https://protomaps.com/about) |
| `purdue-university-libraries → operates → re3data` | [About re3data](https://www.re3data.org/about) |
| `q-quatics → operates → fishbase` | [FishBase homepage](https://fishbase.se/home.htm) |
| `q-quatics → operates → sealifebase` | [About SeaLifeBase](https://www.sealifebase.ca/home/who_we_are.php) |
| `sea-around-us-operator → operates → sea-around-us` | [About Sea Around Us](https://www.seaaroundus.org/about-2/) |
| `seadatanet-consortium → operates → seadatanet` | [About SeaDataNet](https://www.seadatanet.org/content/download/733/file/SDN2_D611_WP6_leaflet.pdf) |
| `seadatanet-consortium → operates → seadatanet-cdi` | [SeaDataNet CDI manual](https://www.seadatanet.org/content/download/599/file/SDN2_D57_TC_UserManualforUpdatingCDI-Data-Access-Service.pdf) |
| `socat-community → operates → socat` | [About SOCAT](https://socat.info/index.php/about/) |
| `university-of-colorado-boulder-and-collaborators → operates → argovis` | [Argovis project presentation](https://argovis.colorado.edu/Argovis_hackathon_S2024_Giglio.pdf) |
| `university-of-washington → operates → ooi-data` | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `us-godae → operates → argo-gdac` | [Argo data system](https://argo.ucsd.edu/organization/argo-data-system/) |
| `whoi → operates → bco-dmo` | [About BCO-DMO](https://www.bco-dmo.org/about) |
| `whoi → operates → ooi-data` | [About OOI](https://oceanobservatories.org/about-ooi/) |
| `jamstec → publishes_to → bismal` | [JAMSTEC databases](https://www.jamstec.go.jp/e/database/) |
| `bco-dmo → syncs_to → noaa-ncei-marine` | [About BCO-DMO](https://www.bco-dmo.org/about) |
| `bismal → syncs_to → platform-obis` | [About BISMaL / J-OBIS](https://www.godac.jamstec.go.jp/bismal/e/about.html) |
| `ddbj → syncs_to → ena` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ddbj → syncs_to → genbank` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ena → syncs_to → ddbj` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ena → syncs_to → genbank` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `ena → syncs_to → mgnify` | [MGnify data flow](https://docs.mgnify.org/src/docs/dataflow.html) |
| `eurobis → syncs_to → platform-obis` | [About EurOBIS](https://www.eurobis.org/about) |
| `genbank → syncs_to → ddbj` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
| `genbank → syncs_to → ena` | [INSDC membership and exchange](https://www.insdc.org/about-insdc/) |
