import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { type DerivedState, type Phase, phaseDetails } from "./derive-state";

type Props = {
  phase: Phase;
  state: DerivedState;
  isLast: boolean;
};

export function PhaseRow({ phase, state, isLast }: Props) {
  const meta = phaseDetails(phase, state);
  const isDone = phase.status === "done";
  const isActive = phase.status === "active";
  const isQueued = phase.status === "queued";

  return (
    <li className="relative flex items-start gap-3.5 py-2.5">
      <div className="relative mt-px inline-flex size-5.5 shrink-0 items-center justify-center">
        {isDone && (
          <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-cat-workflow-soft text-cat-workflow">
            <Check size={11} strokeWidth={2.5} />
          </span>
        )}
        {isActive && (
          <span
            className="inline-block size-2.25 rounded-full bg-accent"
            style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
          />
        )}
        {isQueued && (
          <span className="inline-block size-2.25 rounded-full border-1.5 border-border-strong bg-bg" />
        )}
        {!isLast && (
          <span className="absolute left-1/2 top-5.5 h-[calc(100%+0.25rem)] w-px -translate-x-1/2 bg-border" />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "whitespace-nowrap text-sm",
              isActive ? "font-semibold text-fg" : "font-medium",
              isQueued ? "text-fg-subtle" : "text-fg",
            )}
          >
            {phase.label}
          </span>
          {meta.right && (
            <span
              className={cn(
                "shrink-0 font-mono text-xs tabular-nums",
                isDone && "text-cat-workflow",
                isActive && "text-accent",
                isQueued && "text-fg-subtle",
              )}
            >
              {meta.right}
            </span>
          )}
        </div>
        {meta.detail && (
          <div className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{meta.detail}</div>
        )}
      </div>
    </li>
  );
}
