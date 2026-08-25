export interface MapZoomNotice {
  layerName: string;
  detail?: string;
}

interface DataQueryMapZoomNoticeProps {
  notices: MapZoomNotice[];
}

/**
 * Top-of-map banner when enabled layers need a higher zoom level to display.
 */
export default function DataQueryMapZoomNotice({
  notices,
}: DataQueryMapZoomNoticeProps) {
  if (notices.length === 0) return null;

  return (
    <div
      id="data-query-map-zoom-notice"
      className="pointer-events-none absolute top-3 left-1/2 z-20 flex w-[min(100%,28rem)] -translate-x-1/2 flex-col gap-2 px-3"
    >
      {notices.map((notice) => (
        <div
          key={notice.layerName}
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm"
        >
          <p className="text-sm font-medium text-amber-900">
            Zoom in to see {notice.layerName}
          </p>
          {notice.detail && (
            <p className="mt-0.5 text-xs text-amber-800/90">{notice.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
}
