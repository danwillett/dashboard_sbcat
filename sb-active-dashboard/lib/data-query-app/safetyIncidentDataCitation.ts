/**
 * Data citation and use language for safety incident exports and downloads.
 * Centralized here for easy updates as attribution requirements evolve.
 */
export const TIMS_CITATION =
  "Transportation Injury Mapping System (TIMS), Safe Transportation Research and Education Center, University of California, Berkeley. 2026";

export const SAFETY_INCIDENT_DATA_CITATION = {
  title: "Data citation & use",
  paragraphs: [
    "Safety incident data in this export were compiled by the UCSB Center for Spatial Science (@Spatial).",
    `Police-reported incident records are derived from the Statewide Integrated Traffic Records System (SWITRS) and accessed through ${TIMS_CITATION} (https://tims.berkeley.edu/).`,
    "Crowdsourced incident reports were accessed from BikeMaps.org (https://bikemaps.org/).",
    "This work was supported by the Regional Early Action Planning Grants Program (REAP 2.0).",
  ],
} as const;

export const SAFETY_INCIDENT_DATA_SOURCES = {
  tims: {
    label: "TIMS",
    citation: TIMS_CITATION,
    url: "https://tims.berkeley.edu/",
  },
  bikemaps: {
    label: "BikeMaps.org",
    url: "https://bikemaps.org/",
  },
  spatial: {
    label: "UCSB Center for Spatial Science",
    url: "https://spatial.ucsb.edu/",
  },
} as const;
