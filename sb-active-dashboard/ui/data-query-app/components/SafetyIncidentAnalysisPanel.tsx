import { useEffect, useMemo, useState } from "react";
import {
  fetchIncidentParties,
  SafetyIncidentParty,
  SafetyIncidentSummary,
} from "@/lib/data-query-app/safetyIncidentQuery";
import {
  formatIncidentWhen,
  incidentInvolvementList,
  incidentSelectionLabel,
} from "@/lib/data-query-app/safetyIncidentDisplay";
import { FilteredIncidentStats } from "@/lib/data-query-app/safetyIncidentStats";
import { SafetyIncidentFilterState } from "@/lib/data-query-app/safetyIncidentFilters";
import { SafetyIncidentChartDimension } from "@/lib/data-query-app/safetyIncidentChartOptions";
import SafetyIncidentChartModal from "@/ui/data-query-app/components/SafetyIncidentChartModal";

interface SafetyIncidentAnalysisPanelProps {
  incidents: SafetyIncidentSummary[];
  truncated?: boolean;
  selectedIncidentId: string | null;
  selectedIncident: SafetyIncidentSummary | null;
  incidentLayerUrl?: string | null;
  loading?: boolean;
  error?: string | null;
  datasetTitle: string;
  filters: SafetyIncidentFilterState;
  onFiltersChange: (next: SafetyIncidentFilterState) => void;
  incidentCount: number | null;
  filterStats: FilteredIncidentStats;
  filterStatsLoading?: boolean;
  jurisdictionStatsLoading?: boolean;
  geographicLevel?: "county" | "city" | "service-area";
  onSelectIncident: (objectId: string | null) => void;
  onLoadJurisdictionBreakdown?: (
    level: "city" | "service-area"
  ) => Promise<void>;
}

function incidentLabel(incident: SafetyIncidentSummary): string {
  return incidentSelectionLabel(incident);
}

export default function SafetyIncidentAnalysisPanel({
  incidents,
  truncated = false,
  selectedIncidentId,
  selectedIncident,
  incidentLayerUrl,
  loading,
  error,
  datasetTitle,
  filters,
  onFiltersChange,
  incidentCount,
  filterStats,
  filterStatsLoading,
  jurisdictionStatsLoading,
  geographicLevel = "county",
  onSelectIncident,
  onLoadJurisdictionBreakdown,
}: SafetyIncidentAnalysisPanelProps) {
  const [parties, setParties] = useState<SafetyIncidentParty[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartDimension, setChartDimension] =
    useState<SafetyIncidentChartDimension>("severity");

  const selectOptions = useMemo(() => {
    if (
      selectedIncident &&
      !incidents.some((row) => row.objectId === selectedIncident.objectId)
    ) {
      return [selectedIncident, ...incidents];
    }
    return incidents;
  }, [incidents, selectedIncident]);

  useEffect(() => {
    const incidentId = selectedIncident?.incidentId;
    if (!incidentId || !incidentLayerUrl) {
      setParties([]);
      setPartiesError(null);
      return;
    }

    let cancelled = false;
    setPartiesLoading(true);
    setPartiesError(null);

    fetchIncidentParties(incidentLayerUrl, incidentId)
      .then((rows) => {
        if (cancelled) return;
        setParties(rows);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setParties([]);
        setPartiesError(err.message || "Could not load party records");
      })
      .finally(() => {
        if (!cancelled) setPartiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedIncident?.incidentId, incidentLayerUrl]);

  const ru = filterStats.roadUser;

  const openChartModal = (dimension: SafetyIncidentChartDimension = "severity") => {
    setChartDimension(dimension);
    setChartModalOpen(true);
  };

  return (
    <div id="safety-incident-analysis-panel" className="flex flex-col">
      <div className="border-b border-gray-100 px-4 py-4">
        <h3 className="text-base font-medium text-gray-800">
          Filtered incident summary
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Totals for incidents matching the current Filters tab
          {geographicLevel !== "county" ? ` (${geographicLevel})` : ""}.
        </p>
        {filterStatsLoading ? (
          <p className="mt-3 text-sm text-gray-500">Loading summary…</p>
        ) : (
          <div className="mt-3 space-y-0.5 text-sm">
            <StatRow label="Total incidents" value={ru.total} strong />
            <StatRow label="Bicyclist only" value={ru.bicyclist} indent />
            <StatRow label="Pedestrian only" value={ru.pedestrian} indent />
            <StatRow label="Both bike & ped" value={ru.both} indent />
            {ru.neither > 0 && (
              <StatRow label="Neither / unknown" value={ru.neither} indent />
            )}
            {filterStats.truncated && (
              <p className="pt-1 text-[11px] text-amber-600">
                Stats use the first {filterStats.featureCount.toLocaleString()}{" "}
                matching incidents.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => openChartModal("severity")}
          className="mt-4 w-full rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
        >
          Explore charts…
        </button>
        <p className="mt-1.5 text-[11px] text-gray-400">
          Open a larger chart view with plot options and live filters.
        </p>
      </div>

      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-medium text-gray-800">
              Selected incident
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Choose from the list or click an incident on the map. Click empty
              map area to clear.
            </p>
          </div>
          {selectedIncidentId && (
            <button
              type="button"
              onClick={() => onSelectIncident(null)}
              className="shrink-0 rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              style={{ backgroundColor: "#ffffff", color: "#374151" }}
            >
              Clear selection
            </button>
          )}
        </div>
        <select
          id="safety-incident-select"
          className="mt-3 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          value={selectedIncidentId || ""}
          onChange={(e) => onSelectIncident(e.target.value || null)}
        >
          <option value="">Select an incident…</option>
          {selectOptions.map((incident) => (
            <option key={incident.objectId} value={incident.objectId}>
              {incidentLabel(incident)}
            </option>
          ))}
        </select>
        {truncated && (
          <p className="mt-1 text-[11px] text-gray-400">
            Showing the most recent 400 matching incidents. Narrow filters to
            see more specific events.
          </p>
        )}
      </div>

      {loading && (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          Loading incidents…
        </p>
      )}
      {error && <p className="px-4 py-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && !selectedIncident && (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No incident selected.
        </p>
      )}

      {selectedIncident && (
        <div className="space-y-4 px-4 py-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Summary</h4>
            <dl className="mt-2 space-y-2 text-sm">
              <Row label="When" value={formatIncidentWhen(selectedIncident.timestamp)} />
              <Row label="Location" value={selectedIncident.location || "—"} />
              <Row label="Severity" value={selectedIncident.severity || "—"} />
              <Row
                label="Conflict type"
                value={selectedIncident.conflictType || "—"}
              />
              <Row
                label="Data source"
                value={selectedIncident.dataSource || "—"}
              />
              <Row label="Involved" value={incidentInvolvementList(selectedIncident)} />
              <Row
                label="Incident ID"
                value={
                  selectedIncident.incidentId != null
                    ? String(selectedIncident.incidentId)
                    : "—"
                }
              />
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800">
              Parties / victims
            </h4>
            {partiesLoading && (
              <p className="mt-2 text-xs text-gray-500">Loading party records…</p>
            )}
            {partiesError && (
              <p className="mt-2 text-xs text-red-600">{partiesError}</p>
            )}
            {!partiesLoading && !partiesError && parties.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">
                No related party records found for this incident.
              </p>
            )}
            {!partiesLoading && parties.length > 0 && (
              <div className="mt-2 space-y-2">
                {parties.map((party, index) => (
                  <div
                    key={`${party.party_number}-${party.victim_number}-${index}`}
                    className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                  >
                    <div className="font-medium text-gray-800">
                      Party {party.party_number ?? index + 1}
                      {party.victim_number != null
                        ? ` · Victim ${party.victim_number}`
                        : ""}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <span>Type: {party.party_type || "—"}</span>
                      <span>Injury: {party.injury_severity || "—"}</span>
                      <span>Bike: {party.bicycle_type || "—"}</span>
                      <span>
                        {party.age != null ? `Age: ${party.age}` : "Age: —"}
                        {party.gender ? ` · ${party.gender}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <SafetyIncidentChartModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        datasetTitle={datasetTitle}
        filters={filters}
        onFiltersChange={onFiltersChange}
        incidentCount={incidentCount}
        filtersLoading={!!loading}
        filtersError={error ?? null}
        filterStats={filterStats}
        filterStatsLoading={!!filterStatsLoading}
        jurisdictionStatsLoading={!!jurisdictionStatsLoading}
        onLoadJurisdictionBreakdown={
          onLoadJurisdictionBreakdown ?? (async () => undefined)
        }
        initialDimension={chartDimension}
      />
    </div>
  );
}

function StatRow({
  label,
  value,
  indent,
  strong,
}: {
  label: string;
  value: number;
  indent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between rounded px-1 py-0.5 ${
        strong ? "bg-gray-100 font-medium" : "bg-white"
      } ${indent ? "pl-4" : ""}`}
    >
      <span className="text-gray-800">{label}</span>
      <span className="text-gray-900">{value.toLocaleString()}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
