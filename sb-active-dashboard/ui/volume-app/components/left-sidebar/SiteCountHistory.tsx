import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { fetchVolumeSiteSeries } from "../../../../lib/data-services/VolumeSitesApiService";
import {
  VolumeSiteQueryFilters,
  VolumeSeriesLine,
} from "../../../../lib/volume-app/siteTemporalQuery";

interface SiteCountHistoryProps {
  siteId: string | null;
  siteName?: string | null;
  filters: VolumeSiteQueryFilters;
  onClear?: () => void;
}

const MODE_COLORS: Record<string, string> = {
  bike: "#2563eb",
  ped: "#ea580c",
};

const FLOW_DASH: Record<string, number[] | undefined> = {
  all: undefined,
  in: [6, 3],
  out: [2, 3],
};

function formatMode(countType: string | null): string {
  if (countType === "bike") return "Bike";
  if (countType === "ped") return "Pedestrian";
  return countType || "Unknown";
}

function formatFlow(flow: string | null | undefined): string {
  if (!flow || flow === "all") return "All directions";
  return flow.replace(/_/g, " ");
}

function seriesLabel(line: VolumeSeriesLine): string {
  const parts = [formatMode(line.count_type), formatFlow(line.flow)];
  if (line.count_subtype) parts.push(line.count_subtype);
  if (line.subset) parts.push(line.subset);
  return parts.join(" · ");
}

function colorFor(line: VolumeSeriesLine, index: number): string {
  const base = MODE_COLORS[line.count_type || ""] || "#64748b";
  if (!line.flow || line.flow === "all") return base;
  const palette = [base, "#0ea5e9", "#7c3aed", "#16a34a", "#db2777"];
  return palette[index % palette.length];
}

export default function SiteCountHistory({
  siteId,
  siteName,
  filters,
  onClear,
}: SiteCountHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(siteName || "");
  const [lines, setLines] = useState<VolumeSeriesLine[]>([]);

  useEffect(() => {
    if (!siteId) {
      setLines([]);
      setError(null);
      setTitle("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVolumeSiteSeries(Number(siteId), filters)
      .then((payload) => {
        if (cancelled) return;
        const directional = payload.series.filter((line) => line.flow && line.flow !== "all");
        setLines(directional.length > 0 ? directional : payload.series);
        setTitle(payload.name || siteName || `Site ${siteId}`);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLines([]);
        setError(err.message || "Failed to load count history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [siteId, siteName, filters]);

  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: { fontSize: 10 },
      },
      grid: { left: 44, right: 12, top: 12, bottom: 52 },
      xAxis: {
        type: "time",
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Counts",
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
        min: 0,
      },
      series: lines.map((line, index) => ({
        name: seriesLabel(line),
        type: "line",
        showSymbol: line.points.length <= 40,
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: colorFor(line, index),
          type: FLOW_DASH[line.flow || ""] ? "dashed" : "solid",
        },
        itemStyle: { color: colorFor(line, index) },
        data: line.points
          .filter((point) => point.t)
          .map((point) => [point.t, point.c]),
      })),
    };
  }, [lines]);

  return (
    <div id="volume-site-count-history" className="px-4 py-4 bg-slate-50 border-b border-gray-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base font-medium text-gray-800">Count History</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {siteId
              ? title || `Site ${siteId}`
              : "Click a count site on the map to see counts by mode and direction."}
          </p>
        </div>
        {siteId && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {!siteId && (
        <div className="text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-md px-3 py-6 text-center">
          Select a survey site to open its count history.
        </div>
      )}

      {siteId && loading && (
        <div className="text-sm text-gray-500 bg-white rounded-md px-3 py-6 text-center">
          Loading count history...
        </div>
      )}

      {siteId && error && (
        <div className="text-sm text-red-600 bg-white rounded-md px-3 py-4">
          {error}
        </div>
      )}

      {siteId && !loading && !error && lines.length === 0 && (
        <div className="text-sm text-gray-500 bg-white rounded-md px-3 py-6 text-center">
          No counts for this site in the current filters.
        </div>
      )}

      {siteId && !loading && !error && lines.length > 0 && (
        <ReactECharts option={option} style={{ height: 260, width: "100%" }} notMerge />
      )}
    </div>
  );
}
