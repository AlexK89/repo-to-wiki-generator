import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "./-wiki/overview-page";

export const Route = createFileRoute("/wiki/$wikiId/")({
  component: OverviewRoute,
});

function OverviewRoute() {
  const { wikiId } = Route.useParams();
  return <OverviewPage wikiId={wikiId} />;
}
