import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { useWiki } from "./-wiki/wiki-context";

export const Route = createFileRoute("/wiki/$wikiId/$slug")({
  component: FeatureRoute,
});

function FeatureRoute() {
  const { wikiId, slug } = Route.useParams();
  const { wiki } = useWiki();
  const feature = wiki.features.find((candidate) => candidate.slug === slug);
  if (!feature) throw notFound();

  return (
    <article className="fade-in pb-20">
      <Link
        to="/wiki/$wikiId"
        params={{ wikiId }}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={12} />
        Overview
      </Link>
      <div className="mb-3">
        <CategoryBadge category={feature.category} />
      </div>
      <h1 className="mb-3 text-4xl font-semibold leading-tight tracking-tight text-fg">
        {feature.title}
      </h1>
      <p className="max-w-[68ch] text-lg leading-relaxed text-fg-muted">
        {feature.oneLiner}
      </p>
      <div className="mt-10 rounded-md border border-dashed border-border bg-bg-subtle px-5 py-6 text-sm text-fg-subtle">
        Feature page content — overview, how it works, citations, sources —
        ships in the next step.
      </div>
    </article>
  );
}
