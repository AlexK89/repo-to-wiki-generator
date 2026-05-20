import type { DerivedState } from "./derive-state";
import { PhaseRow } from "./phase-row";
import { RepoLine } from "./repo-line";

type Props = {
  state: DerivedState;
  repoUrl: string;
  sha: string;
};

export function ChecklistLoader({ state, repoUrl, sha }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-1 flex-col px-8 pb-8 pt-16">
      <RepoLine repoUrl={repoUrl} sha={sha} />

      <h1 className="mb-1.5 mt-3.5 text-3xl font-semibold leading-tight tracking-tight text-fg">
        {state.doneShown ? "Wiki ready." : "Generating wiki"}
      </h1>
      <p className="text-base leading-relaxed text-fg-muted">
        {state.doneShown
          ? "Opening…"
          : "Reading the source, identifying user-facing features, and writing pages with cited evidence."}
      </p>

      <div className="mt-7 h-0.75 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${state.progressPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between whitespace-nowrap font-mono text-xs tabular-nums text-fg-subtle">
        <span>{state.progressPct}%</span>
        <span>{state.elapsedSec}s elapsed</span>
      </div>

      <ul className="mt-8 flex flex-col gap-0.5">
        {state.phases.map((phase, i) => (
          <PhaseRow
            key={phase.id}
            phase={phase}
            state={state}
            isLast={i === state.phases.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}
