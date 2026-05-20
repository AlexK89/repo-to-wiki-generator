import { Moon, Sun } from "lucide-react";

import { CubicLogo } from "@/components/cubic-logo";

type Props = {
  dark: boolean;
  onToggleDark: () => void;
};

export function LandingHeader({ dark, onToggleDark }: Props) {
  return (
    <header className="relative mx-auto flex max-w-300 items-center justify-between px-8 py-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-fg text-bg">
          <CubicLogo size={15} />
        </span>
        <span className="text-base font-semibold tracking-tight">cubic</span>
        <span className="text-base text-fg-subtle">/ wiki</span>
      </div>

      <nav className="flex items-center">
        <button
          type="button"
          onClick={onToggleDark}
          title="Toggle theme"
          aria-label="Toggle theme"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-transparent text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>
    </header>
  );
}
