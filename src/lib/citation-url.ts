import type { Citation, WikiRepo } from "@/types/wiki";

export function buildCitationUrl(citation: Citation, repo: WikiRepo): string {
  const base = `https://github.com/${repo.owner}/${repo.name}/blob/${repo.sha}/${citation.path}`;
  if (!citation.startLine) return base;
  const range = citation.endLine
    ? `#L${citation.startLine}-L${citation.endLine}`
    : `#L${citation.startLine}`;
  return `${base}${range}`;
}

export function formatLineRange(citation: Citation): string {
  if (!citation.startLine) return "";
  return citation.endLine
    ? `L${citation.startLine}–${citation.endLine}`
    : `L${citation.startLine}`;
}
