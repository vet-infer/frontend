import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { IconBadge } from "./IconBadge";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  descriptionClassName?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, descriptionClassName, action }: EmptyStateProps) {
  return (
    <div>
      <IconBadge className="mx-auto h-16 w-16" icon={icon} iconSize={30} />
      <h2 className="mt-5 text-xl font-extrabold text-[#172554]">{title}</h2>
      <p className={cn("mt-2 max-w-md text-sm leading-6 text-slate-500", descriptionClassName)}>{description}</p>
      {action}
    </div>
  );
}
