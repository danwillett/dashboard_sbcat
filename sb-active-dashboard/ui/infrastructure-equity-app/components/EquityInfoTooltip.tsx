import Tooltip from "@/ui/components/Tooltip";

interface EquityInfoTooltipProps {
  text: string;
  align?: "left" | "center" | "right";
}

export default function EquityInfoTooltip({
  text,
  align = "center",
}: EquityInfoTooltipProps) {
  return (
    <Tooltip text={text} align={align} className="flex-shrink-0" />
  );
}
