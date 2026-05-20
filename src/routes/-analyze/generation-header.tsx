import { Check, Loader } from "lucide-react";

import { CubicLogo } from "@/components/cubic-logo";
import { Link } from "@tanstack/react-router";

type Props = {
  isDone: boolean;
};

export function GenerationHeader({ isDone }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-bg-elev px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="inline-flex size-6.5 items-center justify-center rounded-md bg-fg text-bg">
          <CubicLogo size={14} />
        </span>
        <span className="text-sm font-semibold tracking-tight">cubic</span>
        <span className="text-sm text-fg-subtle">/ wiki</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 text-sm text-fg-muted">
        <span>{isDone ? "Ready" : "Generating"}</span>
        {isDone ? (
          <Check size={13} className="text-cat-workflow" />
        ) : (
          <Loader size={13} className="animate-spin" />
        )}
      </div>
    </header>
  );
}
