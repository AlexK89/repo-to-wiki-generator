import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { richCliLog, richCliWiki } from "@/data/rich-cli-wiki";
import { getAnalyzeJobRequest } from "@/lib/client/api";
import type { AnalyzeJobPublic } from "@/types/job";
import { ChecklistLoader } from "./-analyze/checklist-loader";
import {
  deriveState,
  deriveStateFromJob,
  lineRevealDelay,
} from "./-analyze/derive-state";
import { GenerationControls } from "./-analyze/generation-controls";
import { GenerationHeader } from "./-analyze/generation-header";

export const Route = createFileRoute("/analyze/$jobId")({
  component: AnalyzeComponent,
});

function AnalyzeComponent() {
  const navigate = useNavigate();
  const { jobId } = Route.useParams();
  const isMockJob = jobId === "mock";

  const [job, setJob] = useState<AnalyzeJobPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mockVisibleCount, setMockVisibleCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startedAtMs] = useState(() => Date.now());

  const isMockComplete = mockVisibleCount >= richCliLog.length;
  const doneShown = isMockJob ? isMockComplete : job?.status === "completed";

  useEffect(() => {
    if (!isMockJob || isPaused || isMockComplete) return;
    const timeout = setTimeout(
      () =>
        setMockVisibleCount((count) =>
          Math.min(count + 1, richCliLog.length),
        ),
      lineRevealDelay(richCliLog[mockVisibleCount]),
    );
    return () => clearTimeout(timeout);
  }, [mockVisibleCount, isPaused, isMockComplete, isMockJob]);

  useEffect(() => {
    if (
      isMockJob ||
      isPaused ||
      job?.status === "completed" ||
      job?.status === "failed"
    ) {
      return;
    }

    let cancelled = false;

    const pollJob = async () => {
      try {
        const nextJob = await getAnalyzeJobRequest(jobId);
        if (cancelled) return;
        setJob(nextJob);
        setError(nextJob.status === "failed" ? nextJob.error ?? null : null);
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
    if (isMockJob || isPaused) return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [isMockJob, isPaused]);

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

  const repoUrl = isMockJob
    ? `https://github.com/${richCliWiki.repo.owner}/${richCliWiki.repo.name}`
    : job?.repoUrl ?? "";
  const sha = isMockJob ? richCliWiki.repo.sha : job?.repo?.sha ?? "";

  const state = isMockJob
    ? deriveState(richCliLog, mockVisibleCount, isMockComplete)
    : deriveStateFromJob(
        {
          status: job?.status ?? "analyzing",
          phase: job?.phase ?? "fetch",
          pagesDone: job?.pagesDone ?? 0,
          totalPages: job?.totalPages ?? 0,
          featuresFound: job?.featuresFound ?? 0,
          startedAtMs,
        },
        nowMs,
      );

  const onSkip = () => {
    const wikiId = isMockJob ? jobId : job?.wikiId;
    if (wikiId) {
      navigate({ to: "/wiki/$wikiId", params: { wikiId } });
      return;
    }
    if (isMockJob) setMockVisibleCount(richCliLog.length);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <GenerationHeader isDone={Boolean(doneShown)} />
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
        onPause={() => setIsPaused((value) => !value)}
        onSkip={onSkip}
      />
    </div>
  );
}
