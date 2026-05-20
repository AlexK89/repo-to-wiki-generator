import type { Citation } from "@/types/wiki";
import type { DigestFileExcerpt } from "../github/digest";

export type SourceFileContent = {
  path: string;
  content: string;
};

const CITATION_PATTERN = /%CITE:(\d+)%([\s\S]*?)%\/CITE%/g;

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const stripLineNumberPrefix = (line: string) =>
  line.replace(/^\d+:\s?/, "");

const toLines = (content: string) =>
  content.split(/\r?\n/).map(stripLineNumberPrefix);

const getCitationKey = (citation: Citation) =>
  `${citation.path}:${citation.startLine ?? ""}:${citation.endLine ?? ""}`;

const getSourceExcerpt = (
  sourceFile: SourceFileContent,
  startLine: number,
  endLine: number,
) => toLines(sourceFile.content).slice(startLine - 1, endLine).join("\n");

const isValidLineRange = (
  sourceFile: SourceFileContent,
  startLine: number | undefined,
  endLine: number | undefined,
) => {
  if (!startLine || !endLine || startLine > endLine) return false;
  return endLine <= toLines(sourceFile.content).length;
};

const buildSourceLookup = (sourceFiles: SourceFileContent[]) =>
  new Map(sourceFiles.map((sourceFile) => [sourceFile.path, sourceFile]));

export const sourceFilesFromDigestExcerpts = (
  excerpts: DigestFileExcerpt[],
): SourceFileContent[] =>
  excerpts.map((excerpt) => ({
    path: excerpt.path,
    content: excerpt.content,
  }));

export const validateCitations = (
  citations: Citation[],
  sourceFiles: SourceFileContent[],
) => {
  const sourceLookup = buildSourceLookup(sourceFiles);
  const seenKeys = new Set<string>();

  return citations.flatMap((citation) => {
    const sourceFile = sourceLookup.get(citation.path);
    const startLine = citation.startLine;
    const endLine = citation.endLine;

    if (
      !sourceFile ||
      !isValidLineRange(sourceFile, startLine, endLine) ||
      !startLine ||
      !endLine
    ) {
      return [];
    }

    const citationKey = getCitationKey(citation);
    if (seenKeys.has(citationKey)) return [];
    seenKeys.add(citationKey);

    const excerpt = getSourceExcerpt(
      sourceFile,
      startLine,
      endLine,
    );

    return [
      {
        ...citation,
        excerpt: normalizeWhitespace(excerpt) ? excerpt : citation.excerpt,
      },
    ];
  });
};

export const normalizeCitationMarkers = (
  text: string,
  citationNumberMap: Map<number, number>,
) =>
  text.replace(CITATION_PATTERN, (_match, rawCitationNumber, phrase) => {
    const citationNumber = Number.parseInt(rawCitationNumber, 10);
    const newCitationNumber = citationNumberMap.get(citationNumber);

    if (!newCitationNumber) return phrase;

    return `%CITE:${newCitationNumber}%${phrase}%/CITE%`;
  });

export const renumberCitations = (
  citations: Citation[],
  texts: string[],
) => {
  const referencedNumbers = new Set<number>();

  for (const text of texts) {
    for (const match of text.matchAll(CITATION_PATTERN)) {
      referencedNumbers.add(Number.parseInt(match[1], 10));
    }
  }

  const citationNumberMap = new Map<number, number>();
  const renumberedCitations: Citation[] = [];

  for (const citation of citations) {
    if (!referencedNumbers.has(citation.n)) continue;

    const newCitationNumber = renumberedCitations.length + 1;
    citationNumberMap.set(citation.n, newCitationNumber);
    renumberedCitations.push({ ...citation, n: newCitationNumber });
  }

  return {
    citations: renumberedCitations,
    citationNumberMap,
  };
};
