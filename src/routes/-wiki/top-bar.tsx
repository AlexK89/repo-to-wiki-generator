import { ExternalLink, Moon, Search, Star, Sun } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { CubicLogo } from "@/components/cubic-logo";
import { GithubIcon } from "@/components/icons/github-icon";
import { useWiki } from "./wiki-context";

type Props = {
  isDark: boolean;
  onToggleDark: () => void;
};

export function TopBar({ isDark, onToggleDark }: Props) {
  const { wiki, setSearchOpen } = useWiki();
  const repoUrl = `https://github.com/${wiki.repo.owner}/${wiki.repo.name}`;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-elev/90 px-5 backdrop-blur">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md px-1 py-1 text-fg transition-colors hover:bg-bg-subtle"
      >
        <span className="inline-flex size-6.5 items-center justify-center rounded-md bg-fg text-bg">
          <CubicLogo size={14} />
        </span>
        <span className="text-sm font-semibold tracking-tight">cubic</span>
        <span className="text-sm text-fg-subtle">/ wiki</span>
      </Link>

      <span className="h-5 w-px bg-border" aria-hidden />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GithubIcon size={14} className="text-fg-muted" />
        <span className="truncate text-sm font-medium text-fg">
          {wiki.repo.owner}/{wiki.repo.name}
        </span>
        <span className="shrink-0 rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle">
          @{wiki.repo.sha}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-subtle">
          <Star size={11} />
          {wiki.repo.stars.toLocaleString()}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        title="Search (⌘K)"
        aria-label="Search"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <Search size={14} />
      </button>
      <button
        type="button"
        onClick={onToggleDark}
        title="Toggle theme"
        aria-label="Toggle theme"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
      <a
        href={repoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <ExternalLink size={12} />
        <span>View repo</span>
      </a>
    </header>
  );
}
