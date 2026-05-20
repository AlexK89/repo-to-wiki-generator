import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { getCategoryStyle, resolveWikiCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types/wiki";
import { useWiki } from "./wiki-context";

type Props = {
  features: Feature[];
  wikiId: string;
};

export function RelatedFeatures({ features, wikiId }: Props) {
  const { wiki } = useWiki();

  if (features.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {features.map((feature) => {
        const category = resolveWikiCategory(wiki, feature.category);
        const style = getCategoryStyle(category.slot);

        return (
          <Link
            key={feature.slug}
            to="/wiki/$wikiId/$slug"
            params={{ wikiId, slug: feature.slug }}
            className={cn(
              style.colorClass,
              "group inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev py-1.5 pl-2.5 pr-3 text-sm text-fg transition-colors hover:border-cat hover:bg-cat-soft",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cat" />
            {feature.title}
            <ArrowRight
              size={12}
              className="text-fg-subtle opacity-60 transition-opacity group-hover:opacity-100"
            />
          </Link>
        );
      })}
    </div>
  );
}
