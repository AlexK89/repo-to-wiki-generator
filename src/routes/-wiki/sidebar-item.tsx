import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  to: string;
  params?: Record<string, string>;
  label: string;
  oneLiner?: string;
  icon?: LucideIcon;
  isActive: boolean;
  hasCategoryAccent?: boolean;
};

export function SidebarItem({
  to,
  params,
  label,
  oneLiner,
  icon: Icon,
  isActive,
  hasCategoryAccent,
}: Props) {
  return (
    <Link
      to={to}
      params={params}
      title={oneLiner}
      className={cn(
        "group relative mt-px flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-bg-elev font-medium text-fg shadow-sm"
          : "text-fg-muted hover:bg-bg-elev/60 hover:text-fg",
      )}
    >
      {hasCategoryAccent && (
        <span
          aria-hidden
          className={cn(
            "-ml-1 h-3.5 w-0.75 shrink-0 rounded",
            isActive ? "bg-cat" : "bg-transparent",
          )}
        />
      )}
      {Icon && <Icon size={13} className="shrink-0 opacity-70" />}
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
