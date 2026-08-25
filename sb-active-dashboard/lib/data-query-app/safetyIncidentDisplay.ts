import {
  SafetyIncidentParty,
  SafetyIncidentSummary,
} from "@/lib/data-query-app/safetyIncidentQuery";

export function formatIncidentWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function incidentInvolvementList(incident: SafetyIncidentSummary): string {
  const parts: string[] = [];
  if (incident.bicyclistInvolved) parts.push("Bicyclist");
  if (incident.pedestrianInvolved) parts.push("Pedestrian");
  if (incident.vehicleInvolved) parts.push("Vehicle");
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function incidentSelectionLabel(incident: SafetyIncidentSummary): string {
  const when = formatIncidentWhen(incident.timestamp);
  const loc = incident.location || "Unknown location";
  const shortLoc = loc.length > 42 ? `${loc.slice(0, 40)}…` : loc;
  return `${when} · ${shortLoc}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function summaryRow(label: string, value: string): string {
  return `
    <div style="display:grid;grid-template-columns:110px 1fr;gap:8px;margin-bottom:6px">
      <span style="color:#9ca3af">${escapeHtml(label)}</span>
      <span style="color:#1f2937">${escapeHtml(value)}</span>
    </div>
  `;
}

export function safetyIncidentSummaryHtml(summary: SafetyIncidentSummary): string {
  return `
    <div style="font-size:13px;line-height:1.45;color:#1f2937">
      <div style="font-weight:600;margin-bottom:8px;color:#1f2937">Summary</div>
      ${summaryRow("When", formatIncidentWhen(summary.timestamp))}
      ${summaryRow("Location", summary.location || "—")}
      ${summaryRow("Severity", summary.severity || "—")}
      ${summaryRow("Conflict type", summary.conflictType || "—")}
      ${summaryRow("Data source", summary.dataSource || "—")}
      ${summaryRow("Involved", incidentInvolvementList(summary))}
      ${summaryRow(
        "Incident ID",
        summary.incidentId != null ? String(summary.incidentId) : "—"
      )}
    </div>
  `;
}

export function safetyIncidentPartiesHtml(parties: SafetyIncidentParty[]): string {
  if (parties.length === 0) {
    return `<p style="margin:8px 0 0;font-size:12px;color:#6b7280">No related party records found for this incident.</p>`;
  }

  const cards = parties
    .map((party, index) => {
      const title = `Party ${party.party_number ?? index + 1}${
        party.victim_number != null ? ` · Victim ${party.victim_number}` : ""
      }`;
      return `
        <div style="margin-top:8px;padding:8px 10px;border:1px solid #f3f4f6;border-radius:4px;background:#f9fafb;font-size:12px;color:#374151">
          <div style="font-weight:600;color:#1f2937;margin-bottom:4px">${escapeHtml(title)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px">
            <span>Type: ${escapeHtml(party.party_type || "—")}</span>
            <span>Injury: ${escapeHtml(party.injury_severity || "—")}</span>
            <span>Bike: ${escapeHtml(party.bicycle_type || "—")}</span>
            <span>Age: ${party.age != null ? escapeHtml(String(party.age)) : "—"}${party.gender ? ` · ${escapeHtml(party.gender)}` : ""}</span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div style="margin-top:12px;font-size:13px;color:#1f2937">
      <div style="font-weight:600;margin-bottom:4px">Parties / victims</div>
      ${cards}
    </div>
  `;
}
