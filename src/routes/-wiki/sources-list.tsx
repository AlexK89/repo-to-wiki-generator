import { ExternalLink } from "lucide-react";

import { buildCitationUrl } from "@/lib/citation-url";
import { cn } from "@/lib/utils";
import type { Citation, WikiRepo } from "@/types/wiki";

type Props = {
  citations: Citation[];
  repo: WikiRepo;
};

export function SourcesList({ citations, repo }: Props) {
  return (
    <ol className="m-0 list-none p-0">
      {citations.map((citation, index) => (
        <SourceItem
          key={citation.n}
          citation={citation}
          repo={repo}
          isLast={index === citations.length - 1}
        />
      ))}
    </ol>
  );
}

type ItemProps = {
  citation: Citation;
  repo: WikiRepo;
  isLast: boolean;
};

function SourceItem({ citation, repo, isLast }: ItemProps) {
  const url = buildCitationUrl(citation, repo);
  return (
    <li
      id={`cite-${citation.n}`}
      className={cn(
        "flex gap-3 py-2.5",
        !isLast && "border-b border-border",
      )}
    >
      <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-[11px] font-medium text-accent-soft-fg">
        {citation.n}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-wrap items-center gap-1.5 font-mono text-[12.5px] text-fg transition-colors hover:text-accent"
        >
          <span className="whitespace-nowrap">{citation.path}</span>
          {citation.startLine && (
            <span className="whitespace-nowrap text-accent-soft-fg">
              :L{citation.startLine}
              {citation.endLine ? `–${citation.endLine}` : ""}
            </span>
          )}
          <ExternalLink size={11} className="opacity-50" />
        </a>
        {citation.excerpt && (
          <pre className="nice-scroll mt-2 max-h-30 overflow-x-auto whitespace-pre rounded border border-border bg-bg-code px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-fg-muted">
            <code>{citation.excerpt}</code>
          </pre>
        )}
      </div>
    </li>
  );
}
