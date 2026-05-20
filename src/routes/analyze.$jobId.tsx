import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { richCliLog, richCliWiki } from "@/data/rich-cli-wiki";
import { ChecklistLoader } from "./-analyze/checklist-loader";
import { deriveState, lineRevealDelay } from "./-analyze/derive-state";
import { GenerationControls } from "./-analyze/generation-controls";
import { GenerationHeader } from "./-analyze/generation-header";

export const Route = createFileRoute("/analyze/$jobId")({
  component: AnalyzeComponent,
});

function AnalyzeComponent() {
  // TODO step 11: subscribe to /api/analyze SSE keyed by params.jobId. For now,
  // replay the mock log so the screen behaves end-to-end.
  const log = richCliLog;
  const repoUrl = `https://github.com/${richCliWiki.repo.owner}/${richCliWiki.repo.name}`;
  const sha = richCliWiki.repo.sha;
  const navigate = useNavigate();
  const { jobId } = Route.useParams();

  const [visibleCount, setVisibleCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const doneShown = visibleCount >= log.length;

  useEffect(() => {
    if (isPaused || doneShown) return;
    const t = setTimeout(
      () => setVisibleCount((c) => c + 1),
      lineRevealDelay(log[visibleCount]),
    );
    return () => clearTimeout(t);
  }, [visibleCount, isPaused, doneShown, log]);

  useEffect(() => {
    if (!doneShown) return;
    const t = setTimeout(
      () => navigate({ to: "/wiki/$wikiId", params: { wikiId: jobId } }),
      900,
    );
    return () => clearTimeout(t);
  }, [doneShown, jobId, navigate]);

  const state = deriveState(log, visibleCount, doneShown);

  const onSkip = () => setVisibleCount(log.length);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <GenerationHeader isDone={doneShown} />
      <div className="flex flex-1 flex-col">
        <ChecklistLoader state={state} repoUrl={repoUrl} sha={sha} />
      </div>
      <GenerationControls
        isPaused={isPaused}
        onPause={() => setIsPaused((isPausedNew) => !isPausedNew)}
        onSkip={onSkip}
      />
    </div>
  );
}
