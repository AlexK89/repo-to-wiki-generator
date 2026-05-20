import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { richCliLog, richCliWiki } from "@/data/rich-cli-wiki";
import { getAnalyzeJobRequest } from "@/lib/client/api";
import type { AnalyzeJobPublic } from "@/types/job";
import { ChecklistLoader } from "./-analyze/checklist-loader";
import { deriveState, lineRevealDelay } from "./-analyze/derive-state";
import { GenerationControls } from "./-analyze/generation-controls";
import { GenerationHeader } from "./-analyze/generation-header";

export const Route = createFileRoute("/analyze/$jobId")({
  component: AnalyzeComponent,
});

function AnalyzeComponent() {
  const log = richCliLog;
  const navigate = useNavigate();
  const { jobId } = Route.useParams();
  const isMockJob = jobId === "mock";

  const [job, setJob] = useState<AnalyzeJobPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mockVisibleCount, setMockVisibleCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isComplete = isMockJob
    ? mockVisibleCount >= log.length
    : job?.status === "completed";
  const visibleCount = isMockJob
    ? mockVisibleCount
    : job
      ? getVisibleCountForJob(job, log.length)
      : 0;
  const doneShown = isComplete && visibleCount >= log.length;
  const repoUrl =
    job?.repoUrl ??
    `https://github.com/${richCliWiki.repo.owner}/${richCliWiki.repo.name}`;
  const sha = job?.repo?.sha ?? richCliWiki.repo.sha;

  useEffect(() => {
    if (!isMockJob || isPaused || doneShown) return;
    const timeout = setTimeout(
      () => setMockVisibleCount((count) => cappingVisibleCount(count + 1, log)),
      lineRevealDelay(log[mockVisibleCount]),
    );
    return () => clearTimeout(timeout);
  }, [mockVisibleCount, isPaused, doneShown, isMockJob, log]);

  useEffect(() => {
    if (isMockJob || isPaused || job?.status === "completed" || job?.status === "failed") {
      return;
    }

    let cancelled = false;

    const pollJob = async () => {
      try {
        const nextJob = await getAnalyzeJobRequest(jobId);
        if (!cancelled) {
          setJob(nextJob);
          setError(nextJob.status === "failed" ? nextJob.error ?? null : null);
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "Could not refresh the analysis job.",
          );
        }
      }
    };

    pollJob();
    const interval = window.setInterval(pollJob, 2_500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isMockJob, isPaused, job?.status, jobId]);

  useEffect(() => {
    if (!doneShown) return;

    const wikiId = isMockJob ? jobId : job?.wikiId;
    if (!wikiId) return;

    const timeout = setTimeout(
      () => navigate({ to: "/wiki/$wikiId", params: { wikiId } }),
      900,
    );
    return () => clearTimeout(timeout);
  }, [doneShown, isMockJob, job?.wikiId, jobId, navigate]);

  const state = deriveState(log, visibleCount, doneShown);

  const onSkip = () => {
    const wikiId = isMockJob ? jobId : job?.wikiId;

    if (wikiId) {
      navigate({ to: "/wiki/$wikiId", params: { wikiId } });
      return;
    }

    setMockVisibleCount(log.length);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <GenerationHeader isDone={doneShown} />
      <div className="flex flex-1 flex-col">
        <ChecklistLoader state={state} repoUrl={repoUrl} sha={sha} />
        {error ? (
          <div className="mx-auto -mt-12 mb-12 max-w-140 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
      </div>
      <GenerationControls
        canSkip={isMockJob || Boolean(job?.wikiId)}
        isPaused={isPaused}
        onPause={() => setIsPaused((isPausedNew) => !isPausedNew)}
        onSkip={onSkip}
      />
    </div>
  );
}

const cappingVisibleCount = (visibleCount: number, log: typeof richCliLog) =>
  Math.min(visibleCount, log.length);

const getVisibleCountForJob = (
  job: AnalyzeJobPublic,
  logLength: number,
) => {
  if (job.status === "completed") return logLength;

  return Math.min(
    logLength,
    Math.max(1, Math.ceil((job.progress / 100) * logLength)),
  );
};
