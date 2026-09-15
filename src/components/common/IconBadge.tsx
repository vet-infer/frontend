import type { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

export type IconTone = "brand" | "danger" | "info" | "warning" | "success";

type IconBadgeProps = {
  icon: LucideIcon;
  tone?: IconTone;
  iconSize?: number;
  iconStrokeWidth?: number;
  className?: string;
};

const tones: Record<IconTone, string> = {
  brand: "bg-violet-50 text-brand-500",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
};

export function IconBadge({ icon: Icon, tone = "brand", iconSize = 24, iconStrokeWidth, className }: IconBadgeProps) {
  return (
    <span className={cn("grid place-items-center rounded-full", tones[tone], className)}>
      <Icon size={iconSize} strokeWidth={iconStrokeWidth} />
    </span>
  );
}
