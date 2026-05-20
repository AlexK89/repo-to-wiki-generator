import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { ArrowRight, Search } from "lucide-react";

import { getCategoryStyle, resolveWikiCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useWiki } from "./wiki-context";

export function SearchCommand() {
  const { wiki, wikiId, isSearchOpen, setSearchOpen } = useWiki();
  const navigate = useNavigate();

  const close = () => setSearchOpen(false);

  const goToFeature = (slug: string) => {
    close();
    navigate({ to: "/wiki/$wikiId/$slug", params: { wikiId, slug } });
  };

  const goToOverview = () => {
    close();
    navigate({ to: "/wiki/$wikiId", params: { wikiId } });
  };

  const groupHeadingClass =
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle";

  return (
    <Command.Dialog
      open={isSearchOpen}
      onOpenChange={setSearchOpen}
      label="Search the wiki"
      overlayClassName="fixed inset-0 z-40 bg-fg/30 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-full max-w-xl -translate-x-1/2 px-4"
      className="fade-in overflow-hidden rounded-xl border border-border bg-bg-elev shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5">
        <Search size={14} className="text-fg-subtle" />
        <Command.Input
          autoFocus
          placeholder="Search features, jump to a page…"
          className="flex-1 bg-transparent py-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <kbd className="rounded border border-border bg-bg-subtle px-1.5 py-px font-mono text-[10px] text-fg-subtle">
          esc
        </kbd>
      </div>

      <Command.List className="nice-scroll max-h-96 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-fg-subtle">
          No matches.
        </Command.Empty>

        <Command.Group heading="Pages" className={groupHeadingClass}>
          <Command.Item
            value={`overview ${wiki.repo.name}`}
            onSelect={goToOverview}
            className="group flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-fg-muted aria-selected:bg-bg-subtle aria-selected:text-fg"
          >
            <span className="size-2 rounded-full bg-fg-subtle" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-fg">Overview</div>
              <div className="truncate text-xs text-fg-subtle">
                {wiki.summary}
              </div>
            </div>
            <ArrowRight
              size={13}
              className="text-fg-subtle opacity-0 group-aria-selected:opacity-100"
            />
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Features" className={groupHeadingClass}>
          {wiki.features.map((feature) => {
            const category = resolveWikiCategory(wiki, feature.category);
            const style = getCategoryStyle(category.slot);
            const Icon = style.icon;
            return (
              <Command.Item
                key={feature.slug}
                value={`${feature.title} ${feature.oneLiner} ${category.label}`}
                onSelect={() => goToFeature(feature.slug)}
                className={cn(
                  style.colorClass,
                  "group flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-fg-muted aria-selected:bg-bg-subtle aria-selected:text-fg",
                )}
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-cat-soft text-cat">
                  <Icon size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-fg">
                    {feature.title}
                  </div>
                  <div className="truncate text-xs text-fg-subtle">
                    {feature.oneLiner}
                  </div>
                </div>
                <span className="shrink-0 text-[10.5px] font-medium uppercase tracking-wider text-cat">
                  {category.label}
                </span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>

      <div className="flex items-center justify-between border-t border-border bg-bg-subtle px-3.5 py-2 text-[11px] text-fg-subtle">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-bg-elev px-1 font-mono">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-bg-elev px-1 font-mono">
              ↵
            </kbd>
            open
          </span>
        </span>
        <span>{wiki.features.length} features</span>
      </div>
    </Command.Dialog>
  );
}
