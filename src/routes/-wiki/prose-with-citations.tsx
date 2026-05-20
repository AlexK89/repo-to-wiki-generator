import { Fragment, useRef, useState } from "react";

import type { Citation, WikiRepo } from "@/types/wiki";
import { CitationHovercard } from "./citation-hovercard";

type Props = {
  text: string;
  citations: Citation[];
  repo: WikiRepo;
};

type CitationSegment = { kind: "cite"; n: number; text: string };
type PlainSegment = { kind: "plain"; text: string };
type Segment = CitationSegment | PlainSegment;

type InlinePart =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "bold"; value: string };

const CITATION_PATTERN = /%CITE:(\d+)%([\s\S]*?)%\/CITE%/g;
const INLINE_PATTERN = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;

function splitCitations(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ kind: "plain", text: text.slice(cursor, start) });
    }
    segments.push({
      kind: "cite",
      n: Number.parseInt(match[1], 10),
      text: match[2],
    });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({ kind: "plain", text: text.slice(cursor) });
  }
  return segments;
}

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      parts.push({ kind: "text", value: text.slice(cursor, start) });
    }
    if (match[1]) parts.push({ kind: "code", value: match[1].slice(1, -1) });
    else if (match[2]) parts.push({ kind: "bold", value: match[2].slice(2, -2) });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    parts.push({ kind: "text", value: text.slice(cursor) });
  }
  return parts;
}

function renderInline(parts: InlinePart[], keyBase: string) {
  return parts.map((part, index) => {
    const key = `${keyBase}-${index}`;
    if (part.kind === "code") return <code key={key}>{part.value}</code>;
    if (part.kind === "bold") return <strong key={key}>{part.value}</strong>;
    return <Fragment key={key}>{part.value}</Fragment>;
  });
}

export function ProseWithCitations({ text, citations, repo }: Props) {
  const citationLookup = new Map(citations.map((c) => [c.n, c]));
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const segments = splitCitations(paragraph);
        return (
          <p key={paragraphIndex}>
            {segments.map((segment, segmentIndex) => {
              const segmentKey = `${paragraphIndex}-${segmentIndex}`;
              const inline = renderInline(
                parseInline(segment.text),
                segmentKey,
              );
              if (segment.kind === "plain") return inline;
              const citation = citationLookup.get(segment.n);
              if (!citation) return inline;
              return (
                <CitationPhrase
                  key={segmentKey}
                  citation={citation}
                  repo={repo}
                >
                  {inline}
                </CitationPhrase>
              );
            })}
          </p>
        );
      })}
    </>
  );
}

type CitationPhraseProps = {
  citation: Citation;
  repo: WikiRepo;
  children: React.ReactNode;
};

function CitationPhrase({ citation, repo, children }: CitationPhraseProps) {
  const [isOpen, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const open = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), 80);
  };
  const close = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <span
      className="cite-underline relative"
      tabIndex={0}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {isOpen && <CitationHovercard citation={citation} repo={repo} />}
    </span>
  );
}
