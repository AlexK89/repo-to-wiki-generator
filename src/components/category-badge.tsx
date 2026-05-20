import { getCategoryStyle } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { WikiCategory } from "@/types/wiki";

type Props = {
  category: WikiCategory;
  size?: "sm" | "md";
  className?: string;
};

export function CategoryBadge({ category, size = "md", className }: Props) {
  const style = getCategoryStyle(category.slot);
  const Icon = style.icon;
  const isSmall = size === "sm";
  return (
    <span
      className={cn(
        style.colorClass,
        "inline-flex items-center gap-1.5 rounded-full bg-cat-soft text-cat",
        isSmall ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon size={isSmall ? 10 : 12} />
      <span className="font-medium">{category.label}</span>
    </span>
  );
}
