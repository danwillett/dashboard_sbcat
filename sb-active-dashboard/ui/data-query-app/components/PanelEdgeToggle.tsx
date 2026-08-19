interface PanelEdgeToggleProps {
  side: "left" | "right";
  isCollapsed: boolean;
  onClick: () => void;
  id?: string;
}

/** Semicircle radius in px (diameter = 2R). */
const R = 28;

/**
 * True SVG half-circle on the map-facing panel edge.
 * Flat diameter sits on the panel; arc bulges over the map.
 */
export default function PanelEdgeToggle({
  side,
  isCollapsed,
  onClick,
  id,
}: PanelEdgeToggleProps) {
  const pointingLeft = side === "left" ? !isCollapsed : isCollapsed;
  const bulgesRight = side === "left";

  // Arc from top of diameter to bottom, bulging left or right
  const arcPath = bulgesRight
    ? `M 0 0 A ${R} ${R} 0 0 1 0 ${R * 2} Z`
    : `M ${R} 0 A ${R} ${R} 0 0 0 ${R} ${R * 2} Z`;

  const positionClass = bulgesRight
    ? "absolute left-full top-1/2 z-30 -translate-y-1/2"
    : "absolute right-full top-1/2 z-30 -translate-y-1/2";

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      title={isCollapsed ? "Expand panel" : "Collapse panel"}
      aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
      className={`${positionClass} p-0 focus:outline-none`}
      style={{
        width: R,
        height: R * 2,
        background: "transparent",
        border: "none",
        boxShadow: "none",
      }}
    >
      <svg
        width={R}
        height={R * 2}
        viewBox={`0 0 ${R} ${R * 2}`}
        className="block overflow-visible"
        aria-hidden
      >
        <path
          d={arcPath}
          fill="#ffffff"
          stroke="#d1d5db"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={bulgesRight ? R * 0.42 : R * 0.58}
          y={R}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#4b5563"
          fontSize={22}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {pointingLeft ? "‹" : "›"}
        </text>
      </svg>
    </button>
  );
}
