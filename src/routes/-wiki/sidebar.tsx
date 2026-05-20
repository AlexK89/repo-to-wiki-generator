import { BookOpen, RefreshCw, Search, Sparkles } from "lucide-react";

import { CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { SidebarItem } from "./sidebar-item";
import { useWiki } from "./wiki-context";

type Props = {
  activeSlug: string | null;
};

export function Sidebar({ activeSlug }: Props) {
  const { wiki, setSearchOpen } = useWiki();
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    meta: CATEGORIES[category],
    features: wiki.features.filter((feature) => feature.category === category),
  })).filter((group) => group.features.length > 0);

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-67 shrink-0 flex-col overflow-hidden border-r border-border bg-bg-subtle">
      <div className="border-b border-border px-3.5 pb-2.5 pt-3.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-elev px-2.5 py-1.5 text-left transition-colors hover:border-border-strong"
        >
          <Search size={13} className="text-fg-subtle" />
          <span className="flex-1 text-sm text-fg-subtle">
            Search features…
          </span>
          <kbd className="rounded border border-border bg-bg-subtle px-1.5 py-px font-mono text-[10px] text-fg-subtle">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="nice-scroll flex-1 overflow-y-auto px-2 pb-6 pt-3">
        <SidebarItem
          to="/wiki/$wikiId"
          params={{ wikiId: "mock" }}
          label="Overview"
          oneLiner={wiki.summary}
          icon={BookOpen}
          isActive={activeSlug === null}
        />

        {groups.map((group) => {
          const Icon = group.meta.icon;
          return (
            <div key={group.category} className={cn(group.meta.colorClass, "mt-3.5")}>
              <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-cat">
                <Icon size={10} />
                {group.meta.label}
              </div>
              {group.features.map((feature) => (
                <SidebarItem
                  key={feature.slug}
                  to="/wiki/$wikiId/$slug"
                  params={{ wikiId: "mock", slug: feature.slug }}
                  label={feature.title}
                  oneLiner={feature.oneLiner}
                  isActive={activeSlug === feature.slug}
                  hasCategoryAccent
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 text-[11.5px] text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={11} />
          Generated just now
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-fg-muted transition-colors hover:text-fg"
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>
    </aside>
  );
}
