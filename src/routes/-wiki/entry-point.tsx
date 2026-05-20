import {
  FileCode,
  Hash,
  Layers,
  Link as LinkIcon,
  Settings,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { buildCitationUrl } from "@/lib/citation-url";
import type {
  Citation,
  EntryPoint as EntryPointType,
  EntryPointKind,
  WikiRepo,
} from "@/types/wiki";

type Props = {
  entryPoint: EntryPointType;
  citations: Citation[];
  repo: WikiRepo;
};

const KIND_ICONS: Record<EntryPointKind, LucideIcon> = {
  function: FileCode,
  command: Terminal,
  route: LinkIcon,
  component: Layers,
  config: Settings,
};

export function EntryPoint({ entryPoint, citations, repo }: Props) {
  const citation = citations.find(
    (candidate) => candidate.n === entryPoint.citation,
  );
  const url = citation ? buildCitationUrl(citation, repo) : undefined;
  const KindIcon = KIND_ICONS[entryPoint.kind] ?? FileCode;

  const inner = (
    <>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-md bg-bg-subtle text-fg-muted">
          <KindIcon size={12} />
        </span>
        <span className="font-mono text-[13px] font-medium text-fg">
          {entryPoint.name}
        </span>
        <span className="ml-auto text-[10.5px] uppercase tracking-wider text-fg-subtle">
          {entryPoint.kind}
        </span>
      </div>
      {entryPoint.signature && (
        <div className="nice-scroll overflow-x-auto whitespace-pre rounded border border-border bg-bg-code px-2.5 py-1.5 font-mono text-xs text-fg-muted">
          {entryPoint.signature}
        </div>
      )}
      {citation && (
        <div className="mt-2 flex items-center gap-1 font-mono text-[10.5px] text-fg-subtle">
          <Hash size={10} />
          {citation.path}
          {citation.startLine ? `:${citation.startLine}` : ""}
          {citation.endLine ? `–${citation.endLine}` : ""}
        </div>
      )}
    </>
  );

  const className =
    "block rounded-md border border-border bg-bg-elev px-3.5 py-3 transition-colors hover:border-border-strong";

  if (!url) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  );
}
