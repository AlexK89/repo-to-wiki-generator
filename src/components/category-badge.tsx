import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/wiki";

type Props = {
  category: Category;
  size?: "sm" | "md";
  className?: string;
};

export function CategoryBadge({ category, size = "md", className }: Props) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  const isSmall = size === "sm";
  return (
    <span
      className={cn(
        meta.colorClass,
        "inline-flex items-center gap-1.5 rounded-full bg-cat-soft text-cat",
        isSmall ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon size={isSmall ? 10 : 12} />
      <span className="font-medium">{meta.label}</span>
    </span>
  );
}
