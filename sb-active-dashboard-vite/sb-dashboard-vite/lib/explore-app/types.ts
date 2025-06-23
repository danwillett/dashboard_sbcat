export type SafetyChecks = {
  toggled: boolean;
  "All Incidents": boolean;
  "Biking Incidents": boolean;
  "Walking Incidents": boolean;
};

export type CountSiteChecks = {
  toggled: boolean;
  "All Sites": boolean;
  "Biking Sites": boolean;
  "Walking Sites": boolean;
};

export type VolumeChecks = {
  toggled: boolean;
  "Modeled Biking Volumes": boolean;
  "Modeled Walking Volumes": boolean;
};

export type DemographicChecks = {
  Income: boolean;
  Race: boolean;
  Education: boolean;
};
