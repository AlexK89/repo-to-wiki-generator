import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type TocItem = {
  id: string;
  label: string;
};

type Props = {
  items: TocItem[];
};

export function TableOfContents({ items }: Props) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] },
    );

    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-24 hidden w-50 shrink-0 self-start pt-1 xl:block">
      <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-subtle">
        On this page
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block border-l py-1 pl-3 text-[13px] leading-tight transition-colors",
                  isActive
                    ? "border-accent font-medium text-fg"
                    : "border-border text-fg-subtle hover:text-fg",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
