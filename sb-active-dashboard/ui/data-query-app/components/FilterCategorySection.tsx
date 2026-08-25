interface FilterCategorySectionProps {
  id: string;
  title: string;
  allIncludedLabel: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  items: Array<{
    id: string;
    label: string;
    checked: boolean;
    onToggle: () => void;
  }>;
}

export default function FilterCategorySection({
  id,
  title,
  allIncludedLabel,
  enabled,
  onEnabledChange,
  items,
}: FilterCategorySectionProps) {
  return (
    <div id={id} className="px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-gray-700">{title}</h3>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Filter by ${title}`}
          onClick={() => onEnabledChange(!enabled)}
          className={`flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all ${
            enabled ? "justify-end bg-blue-500" : "justify-start bg-gray-300"
          }`}
        >
          <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
        </button>
      </div>
      {enabled ? (
        <div className="space-y-1.5 pl-1">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={item.onToggle}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="leading-snug">{item.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{allIncludedLabel}</p>
      )}
    </div>
  );
}
