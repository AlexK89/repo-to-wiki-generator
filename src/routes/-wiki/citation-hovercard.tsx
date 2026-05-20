import { FileCode } from "lucide-react";

import { GithubIcon } from "@/components/icons/github-icon";
import { buildCitationUrl, formatLineRange } from "@/lib/citation-url";
import type { Citation, WikiRepo } from "@/types/wiki";

type Props = {
  citation: Citation;
  repo: WikiRepo;
};

export function CitationHovercard({ citation, repo }: Props) {
  const url = buildCitationUrl(citation, repo);
  const lineRange = formatLineRange(citation);

  return (
    <span
      role="tooltip"
      className="fade-in absolute bottom-[calc(100%+8px)] left-1/2 z-50 block w-95 max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-md border border-border bg-bg-elev text-left shadow-lg"
    >
      <span className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 font-mono text-[11px] text-fg-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <FileCode size={12} className="shrink-0" />
          <span className="truncate">{citation.path}</span>
          {lineRange && (
            <span className="shrink-0 text-accent-soft-fg">· {lineRange}</span>
          )}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Open on GitHub"
          className="shrink-0 text-fg-muted transition-colors hover:text-fg"
          onClick={(event) => event.stopPropagation()}
        >
          <GithubIcon size={12} />
        </a>
      </span>
      {citation.excerpt && (
        <span className="nice-scroll block max-h-45 overflow-auto whitespace-pre bg-bg-code px-3 py-2.5 text-left font-mono text-[11.5px] leading-relaxed text-fg">
          {citation.excerpt}
        </span>
      )}
    </span>
  );
}
