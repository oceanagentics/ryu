# Global Fishing Watch: backlog document leads

Source: https://docs.google.com/document/d/1e-QWi7_gg8eNogyJ0edgxaaS5bQn2qiNCzotH3UDpt0/edit

These are unverified research leads copied from the priority document. Recheck claims with current primary sources and map them to the current Ryu contract; the document includes obsolete fields and speculative relationships. This is a research batch, not a canonical registry.

Global FIshing Watch

Why:  Part IV is where this lands. Article 33(2) requires an EIA report to describe the baseline environment, assess potential impacts including cumulative ones, and state what's uncertain. Cumulative impact is the hard one. You cannot assess whether a proposed activity adds meaningfully to existing pressure without knowing what pressure is already there, and in the high seas the dominant human pressure is industrial fishing. GFW is the only global, near-real-time, openly licensed picture of it. OBIS tells you what lives there. GFW tells you what is already happening to it. It also matters for Part III, on the monitoring side rather than the designation side. Article 19 proposals need conservation objectives, and Articles 20 and 21 require implementation and monitoring. Once an area is designated, the question becomes whether anything changed. GFW is how you'd answer that, because fishing effort inside a boundary before and after designation is a measurable, defensible signal. WDPA tells you an area exists. GFW tells you whether it's doing anything.

Record:

Global Fishing Watch (GFW)
 Operated by Global Fishing Watch, Inc.
 https://globalfishingwatch.org
 Global near-real-time mapping of apparent fishing effort and vessel activity, derived from satellite AIS and radar data using machine learning.

Gallery item
 GFW map view. Capture the global apparent fishing effort layer with a high seas region selected, showing effort density, the time slider, and a vessel track detail panel.
 Source: Global Fishing Watch map (https://globalfishingwatch.org/map)

Narrative
 Global Fishing Watch began as a collaboration between Oceana, SkyTruth and Google, with the free public tool launched at the Our Ocean Conferences in 2015 and 2016, and was established as an independent international non-profit in June 2017, registered as a US 501(c)(3) based in Washington, D.C. It ingests over 110 million AIS messages a day, supplemented by government vessel monitoring system feeds shared under partnership agreements and by synthetic aperture radar detections that catch vessels not broadcasting AIS at all. Machine learning classifies vessel type and behaviour, producing not just apparent fishing effort but derived event types that matter for enforcement and impact assessment: encounters between vessels at sea, loitering, port visits, and gaps where a vessel's AIS transmission stops. The flagship apparent fishing effort dataset, version 3.0 released March 2025, draws on more than 190,000 unique AIS devices with up to roughly 96,000 active in a given year, covering 2012 to 2024. Data and APIs are free for non-commercial use under CC BY-NC 4.0, with a rate limit of 50,000 requests per day, and Python and R clients are maintained. Note that some GFW layers hosted in Google Earth Engine carry CC BY-SA 4.0 instead, so licence should be recorded per channel rather than per organisation. The interpretive caveat is important and should travel with any use of the data: this is apparent fishing, inferred from movement patterns, not reported or verified catch. Only a fraction of the world's fishing vessels carry AIS, and vessels engaged in illegal activity have the strongest incentive to disable it, so absence of activity in the data is not evidence of absence of fishing.

Profile
 Entity type: System
 Record depth: Rich
 Role: Human Activity Monitoring
 Operator country: US (registered non-profit), INT (international operations and partnerships)
 Discipline: Fisheries And Vessel Monitoring
 Geographic scope: Global, including ABNJ
 Part of: Not applicable
 Aliases: GFW

Review
 Displayed locale: English
 Review state: Agent Researched

Data
 Data types: Apparent Fishing Effort; Vessel Identity And Tracks; Encounters And Transshipment Events; Loitering Events; Port Visits; AIS Disabling Gaps; Satellite Radar Vessel Detections; Geographic / Spatial
 Formats: REST APIs (JSON, map tiles); CSV / Tabular; Static Dataset Downloads; Google Earth Engine Asset; Python Client; R Package
 Standards: CC BY-NC 4.0 (site and APIs); CC BY-SA 4.0 (some Earth Engine layers); AIS And MMSI Vessel Identifiers; IMO Numbers Where Available

Records
 190,000 vessels
 Unique AIS devices represented in the apparent fishing effort dataset version 3.0, with up to approximately 96,000 active in a given year across the 2012 to 2024 period. The live system additionally ingests over 110 million AIS messages daily.
 Source: Zenodo record 14982712, Global AIS-based Apparent Fishing Effort Dataset, March 2025

Database size
 Not published as a single figure
 GFW does not report total storage. The published static apparent fishing effort dataset is distributed through Zenodo in CSV form; live holdings are served through APIs rather than as a downloadable whole.
 Source: Global Fishing Watch, observed 2026

Read access

GFW map
 Read | Web UI
 Free public map of apparent fishing effort, vessel tracks and events, with time filtering, area drawing and layer toggles. No account required for basic use; a free account unlocks saved workspaces and downloads.
 https://globalfishingwatch.org/map
 Source: Global Fishing Watch

4Wings API
 Read | Rest Api
 Gridded apparent fishing effort, vessel presence and SAR detections, returned as aggregated statistics or map tiles for a specified area and time range. This is the route for quantifying effort inside a candidate or designated area.
 https://api-doc.globalfishingwatch.org/
 Source: GFW API documentation

Vessels API
 Read | Rest Api
 Vessel search and identity resolution across AIS, registry and IMO identifiers, including flag state and vessel class.
 https://globalfishingwatch.org/our-apis/
 Source: GFW API documentation

Events API
 Read | Rest Api
 Derived behavioural events: encounters, loitering, port visits and AIS gaps. The most directly enforcement-relevant endpoint, and the one that surfaces vessels attempting to avoid observation.
 https://globalfishingwatch.org/our-apis/
 Source: GFW API documentation

Static dataset download
 Read | Download Portal
 Apparent fishing effort version 3.0 published as CSV through Zenodo with a citable DOI, covering 2012 to 2024. Preferred over the API for reproducible analysis, since the version is fixed.
 https://zenodo.org/records/14982712
 Source: Zenodo

gfwr R package
 Read | R Package
 Maintained R client wrapping the GFW APIs, requiring a free API token.
 https://globalfishingwatch.github.io/gfwr/
 Source: GFW developer documentation

Write / contribution access

Not open to public submission
 Partner sync | Data Ingestion
 GFW does not accept data submissions from the public. It ingests commercial satellite AIS feeds, satellite radar imagery, and government vessel monitoring system data shared voluntarily by states under partnership agreements. Several states have made their VMS data public through GFW as a transparency commitment, which is a governmental decision rather than a submission workflow.
 https://globalfishingwatch.org/our-technology/
 Source: Global Fishing Watch

Usage

AIS messages ingested: over 110,000,000 per day (Global Fishing Watch, observed 2026)
 Unique AIS devices in apparent fishing effort dataset: over 190,000 (Zenodo, March 2025)
 Active vessels per year: approximately 96,000 (Zenodo, March 2025)
 Dataset temporal coverage: 2012 to 2024, version 3.0 (Zenodo, March 2025)
 API rate limit: 50,000 requests per day (GFW API documentation)
 Licence: CC BY-NC 4.0 for site and APIs, CC BY-SA 4.0 for some Earth Engine layers (GFW licence page and Earth Engine catalog)
 Established as independent non-profit: June 2017, public tool launched 2015 to 2016 (Global Fishing Watch)

Connections
 Oceana: founding partner (incoming)
 SkyTruth: founding partner (incoming)
 Google: founding partner and technology provider (incoming)
 National fisheries authorities: voluntary VMS data sharing (incoming)
 Regional fisheries management organizations: policy and data partnerships (bidirectional)
 United Nations: transparency policy engagement (outgoing)
 Protected Planet / WDPA: complementary layer for area monitoring (bidirectional)
 BBNJ Clearing-House Mechanism: prospective source for EIA baselines and ABMT monitoring (outgoing)
