import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { startAnalyzeJobRequest } from "@/lib/client/api";
import { ChecklistLoader } from "./-analyze/checklist-loader";
import { deriveStateFromJob } from "./-analyze/derive-state";
import { GenerationControls } from "./-analyze/generation-controls";
import { GenerationHeader } from "./-analyze/generation-header";

type AnalyzeSearch = { url?: string };

export const Route = createFileRoute("/analyze/")({
  component: AnalyzeStartComponent,
  validateSearch: (search: Record<string, unknown>): AnalyzeSearch => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
});

function AnalyzeStartComponent() {
  const navigate = useNavigate();
  const { url } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [startedAtMs] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!url) {
      navigate({ to: "/", replace: true });
      return;
    }

    let cancelled = false;

    const startJob = async () => {
      try {
        const job = await startAnalyzeJobRequest(url);
        if (cancelled) return;
        navigate({
          to: "/analyze/$jobId",
          params: { jobId: job.id },
          replace: true,
        });
      } catch (submitError) {
        if (!cancelled) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : "Could not start the analysis job.",
          );
        }
      }
    };

    startJob();
    return () => {
      cancelled = true;
    };
  }, [url, navigate]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  const state = deriveStateFromJob(
    {
      status: "analyzing",
      phase: "fetch",
      pagesDone: 0,
      totalPages: 0,
      featuresFound: 0,
      startedAtMs,
    },
    nowMs,
  );

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <GenerationHeader isDone={false} />
      <div className="flex flex-1 flex-col">
        <ChecklistLoader state={state} repoUrl={url ?? ""} sha="" />
        {error ? (
          <div className="mx-auto -mt-12 mb-12 max-w-140 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
      </div>
      <GenerationControls
        canSkip={false}
        isPaused={false}
        onPause={() => undefined}
        onSkip={() => undefined}
      />
    </div>
  );
}
