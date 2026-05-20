import { createFileRoute, notFound } from "@tanstack/react-router";

import { StatusScreen } from "@/components/status-screen";
import { FeaturePage } from "./-wiki/feature-page";
import { useWiki } from "./-wiki/wiki-context";

export const Route = createFileRoute("/wiki/$wikiId/$slug")({
  component: FeatureRoute,
  notFoundComponent: () => (
    <StatusScreen
      variant="not-found"
      title="Feature not found"
      description="This wiki does not have a page with that slug. Try the sidebar to find what you are looking for."
    />
  ),
});

function FeatureRoute() {
  const { wikiId, slug } = Route.useParams();
  const { wiki } = useWiki();
  const feature = wiki.features.find((candidate) => candidate.slug === slug);
  if (!feature) throw notFound();

  return <FeaturePage feature={feature} wiki={wiki} wikiId={wikiId} />;
}
