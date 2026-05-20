import { createFileRoute, notFound } from "@tanstack/react-router";

import { FeaturePage } from "./-wiki/feature-page";
import { useWiki } from "./-wiki/wiki-context";

export const Route = createFileRoute("/wiki/$wikiId/$slug")({
  component: FeatureRoute,
});

function FeatureRoute() {
  const { wikiId, slug } = Route.useParams();
  const { wiki } = useWiki();
  const feature = wiki.features.find((candidate) => candidate.slug === slug);
  if (!feature) throw notFound();

  return <FeaturePage feature={feature} wiki={wiki} wikiId={wikiId} />;
}
