import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { getCategoryStyle, resolveWikiCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types/wiki";
import { useWiki } from "./wiki-context";

type Props = {
  feature: Feature;
  wikiId: string;
};

export function FeatureCard({ feature, wikiId }: Props) {
  const { wiki } = useWiki();
  const category = resolveWikiCategory(wiki, feature.category);
  const style = getCategoryStyle(category.slot);

  return (
    <Link
      to="/wiki/$wikiId/$slug"
      params={{ wikiId, slug: feature.slug }}
      className={cn(
        style.colorClass,
        "group relative block rounded-lg border border-border bg-bg-elev p-4.5 transition-all hover:-translate-y-px hover:border-cat hover:shadow-md",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <CategoryBadge category={category} size="sm" />
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">
          {feature.page.citations.length} citations
        </span>
      </div>
      <div className="mb-1 text-base font-semibold tracking-tight text-fg">
        {feature.title}
      </div>
      <div className="text-sm leading-snug text-fg-muted">
        {feature.oneLiner}
      </div>
      <ArrowRight
        size={14}
        className="absolute right-4 top-4 text-cat opacity-30 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}
