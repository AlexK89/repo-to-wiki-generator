import type { LogLine } from "@/types/wiki";

export type PhaseStatus = "done" | "active" | "queued";

export type PhaseId = "fetch" | "analyze" | "write" | "finalize";

export type PhaseDef = {
  id: PhaseId;
  label: string;
  detail: string;
  startIdx: number;
  endIdx: number;
};

export type Phase = PhaseDef & { status: PhaseStatus };

export type DerivedState = {
  log: LogLine[];
  visible: LogLine[];
  progressPct: number;
  currentStep: LogLine | undefined;
  featuresFound: number;
  pagesDone: number;
  totalFeatures: number;
  elapsedSec: string;
  phases: Phase[];
  doneShown: boolean;
};

export const PHASE_DEFS: readonly PhaseDef[] = [
  { id: "fetch", label: "Read repository", detail: "File tree, manifests, sampling", startIdx: 0, endIdx: 5 },
  { id: "analyze", label: "Identify features", detail: "Grouping code by user-facing capability", startIdx: 6, endIdx: 16 },
  { id: "write", label: "Write pages", detail: "Draft with cited evidence", startIdx: 17, endIdx: 25 },
  { id: "finalize", label: "Validate & cache", detail: "Resolve citations, store wiki", startIdx: 26, endIdx: 29 },
];

export function deriveState(log: LogLine[], visibleCount: number, doneShown: boolean): DerivedState {
  const visible = log.slice(0, visibleCount);
  const progressPct = Math.min(100, Math.round((visibleCount / log.length) * 100));
  const currentStep = [...visible].reverse().find((l) => l.type === "step");
  const featuresFound = visible.filter((l) => l.type === "feature").length;
  const pagesDone = visible.filter((l) => l.type === "page").length;
  const totalFeatures = log.filter((l) => l.type === "feature").length;
  const elapsedSec = (visibleCount * 0.21).toFixed(1);

  const phases: Phase[] = PHASE_DEFS.map((p) => ({
    ...p,
    status:
      doneShown ? "done" :
      visibleCount > p.endIdx ? "done" :
      visibleCount > p.startIdx ? "active" :
      "queued",
  }));

  return { log, visible, progressPct, currentStep, featuresFound, pagesDone, totalFeatures, elapsedSec, phases, doneShown };
}

export type PhaseMeta = { detail: string; right: string };

export function phaseDetails(phase: Phase, state: DerivedState): PhaseMeta {
  if (phase.id === "fetch") {
    return {
      detail:
        phase.status === "queued"
          ? phase.detail
          : "Repository tree, manifests, and source excerpts",
      right: phase.status === "done" ? "done" : phase.status === "active" ? "reading…" : "",
    };
  }
  if (phase.id === "analyze") {
    return {
      detail: state.featuresFound > 0
        ? `${state.featuresFound} features · gpt-5-mini · 1,842 tokens`
        : phase.detail,
      right: phase.status === "done" ? "done" : phase.status === "active" ? `${state.featuresFound} found` : "",
    };
  }
  if (phase.id === "write") {
    return {
      detail: phase.status === "queued"
        ? phase.detail
        : `${state.pagesDone} of ${state.totalFeatures} pages · written in parallel`,
      right: phase.status === "done"
        ? "done"
        : phase.status === "active"
        ? `${state.pagesDone}/${state.totalFeatures}`
        : "",
    };
  }
  return {
    detail: phase.status === "done"
      ? "Citations resolved · cached by commit SHA"
      : phase.detail,
    right: phase.status === "done" ? "done" : phase.status === "active" ? "validating…" : "",
  };
}

export function lineRevealDelay(line: LogLine): number {
  switch (line.type) {
    case "step": return 380;
    case "done": return 600;
    case "feature": return 130;
    case "page": return 280;
    default: return 180;
  }
}
