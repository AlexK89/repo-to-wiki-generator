import { repoAnalyserPrompt } from "../../../prompts/repo-analyser";
import {
  fetchGitHubFiles,
  getTopLevelDirectory,
  isDigestCandidate,
  isGeneratedPath,
  isLockFilePath,
} from "./files";
import { fetchRepositoryTree } from "./tree";
import type { GitHubFetchOptions, GitHubTreeEntry } from "./tree";
import type { RepositoryFile } from "./files";

const DEFAULT_MAX_DIGEST_BYTES = 2_000_000;
const DEFAULT_MAX_FILES = 60;
const DEFAULT_MAX_FILE_BYTES = 140_000;
const DEFAULT_MAX_LINES_PER_FILE = 260;
const DEFAULT_MAX_TREE_ENTRIES = 1_600;

export type LanguageStat = {
  label: string;
  files: number;
  bytes: number;
};

export type DigestFileExcerpt = {
  path: string;
  sha: string;
  size: number;
  reason: string;
  lineStart: number;
  lineEnd: number;
  content: string;
};

export type PromptDigestSections = {
  repoMetadata: string;
  fileTree: string;
  fileExcerpts: string;
};

export type RepositoryDigestStats = {
  filesInTree: number;
  filesSelected: number;
  digestBytes: number;
  promptBytes: number;
  treeEntriesShown: number;
  treeTruncatedByGitHub: boolean;
  languageStats: LanguageStat[];
};

export type RepositoryDigest = PromptDigestSections & {
  repository: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    description: string | null;
    htmlUrl: string;
    stars: number;
    primaryLanguage: string | null;
    license: string | null;
    sha: string;
  };
  selectedFiles: DigestFileExcerpt[];
  prompt: string;
  stats: RepositoryDigestStats;
};

export type RepositoryDigestOptions = GitHubFetchOptions & {
  maxDigestBytes?: number;
  maxFiles?: number;
  maxFileBytes?: number;
  maxLinesPerFile?: number;
  maxTreeEntries?: number;
};

type ScoredTreeEntry = {
  entry: GitHubTreeEntry;
  score: number;
};

const LANGUAGE_LABELS = new Map([
  [".astro", "Astro"],
  [".c", "C"],
  [".cc", "C++"],
  [".cpp", "C++"],
  [".cs", "C#"],
  [".css", "CSS"],
  [".go", "Go"],
  [".html", "HTML"],
  [".java", "Java"],
  [".js", "JavaScript"],
  [".jsx", "React"],
  [".kt", "Kotlin"],
  [".lua", "Lua"],
  [".md", "Markdown"],
  [".mdx", "MDX"],
  [".mjs", "JavaScript"],
  [".py", "Python"],
  [".rb", "Ruby"],
  [".rs", "Rust"],
  [".scss", "SCSS"],
  [".sh", "Shell"],
  [".sql", "SQL"],
  [".svelte", "Svelte"],
  [".swift", "Swift"],
  [".ts", "TypeScript"],
  [".tsx", "React TypeScript"],
  [".vue", "Vue"],
]);

const IMPORTANT_FILE_NAMES = new Set([
  ".env.example",
  "components.json",
  "dockerfile",
  "package.json",
  "pyproject.toml",
  "readme.md",
  "requirements.txt",
  "setup.cfg",
  "setup.py",
  "tsconfig.json",
  "vite.config.ts",
]);

const ENTRY_POINT_FILE_NAMES = new Set([
  "__init__.py",
  "app.py",
  "cli.py",
  "index.js",
  "index.ts",
  "main.js",
  "main.py",
  "main.ts",
  "server.js",
  "server.ts",
]);

const getFileName = (path: string) => path.split("/").at(-1)?.toLowerCase() ?? path;

const getExtension = (path: string) => {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
};

const getDepth = (path: string) => path.split("/").filter(Boolean).length;

const isReadmePath = (path: string) => getFileName(path).startsWith("readme");

const isImportantPath = (path: string) =>
  isReadmePath(path) || IMPORTANT_FILE_NAMES.has(getFileName(path));

const isEntryPointPath = (path: string) =>
  ENTRY_POINT_FILE_NAMES.has(getFileName(path)) ||
  /(^|\/)(cli|main|index|app)\.(js|jsx|mjs|ts|tsx|py|rb|go|rs)$/.test(path);

const isRouteOrPagePath = (path: string) =>
  /(^|\/)(routes?|pages?|app)\//.test(path) ||
  /\.(route|routes|page)\.(js|jsx|ts|tsx)$/.test(path);

const isSourcePath = (path: string) =>
  /(^|\/)(src|lib|packages|cmd|internal)\//.test(path);

const scoreTreeEntry = (entry: GitHubTreeEntry) => {
  let score = 100;

  if (isReadmePath(entry.path)) score += 10_000;
  if (IMPORTANT_FILE_NAMES.has(getFileName(entry.path))) score += 8_000;
  if (isEntryPointPath(entry.path)) score += 7_000;
  if (isRouteOrPagePath(entry.path)) score += 5_000;
  if (isSourcePath(entry.path)) score += 3_000;
  if (/\/tests?\//.test(entry.path)) score -= 1_500;
  if (/\/docs?\//.test(entry.path)) score += 1_000;

  return Math.max(score - getDepth(entry.path) * 25, 1);
};

const getSelectionReason = (path: string) => {
  if (isReadmePath(path)) return "README or overview";
  if (IMPORTANT_FILE_NAMES.has(getFileName(path))) return "project configuration";
  if (isEntryPointPath(path)) return "entry point";
  if (isRouteOrPagePath(path)) return "user-facing route or page";
  if (isSourcePath(path)) return "representative source file";
  return "representative text file";
};

const compareScoredEntries = (
  leftEntry: ScoredTreeEntry,
  rightEntry: ScoredTreeEntry,
) =>
  rightEntry.score - leftEntry.score ||
  leftEntry.entry.path.localeCompare(rightEntry.entry.path);

const getCandidateEntries = (
  tree: GitHubTreeEntry[],
  options: RepositoryDigestOptions,
) =>
  tree
    .filter((entry) =>
      isDigestCandidate(entry, {
        maxFileBytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
      }),
    )
    .map((entry) => ({ entry, score: scoreTreeEntry(entry) }))
    .sort(compareScoredEntries);

export const selectDigestTargets = (
  tree: GitHubTreeEntry[],
  options: RepositoryDigestOptions = {},
) => {
  const maxDigestBytes = options.maxDigestBytes ?? DEFAULT_MAX_DIGEST_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const topLevelCounts = new Map<string, number>();
  const selectedEntries: GitHubTreeEntry[] = [];
  let selectedBytes = 0;

  for (const candidate of getCandidateEntries(tree, options)) {
    const isPriority = isImportantPath(candidate.entry.path);
    const topLevelDirectory = getTopLevelDirectory(candidate.entry.path);
    const topLevelCount = topLevelCounts.get(topLevelDirectory) ?? 0;

    if (!isPriority && topLevelCount >= 2) continue;
    if (selectedEntries.length >= maxFiles) break;
    if (selectedBytes + candidate.entry.size > maxDigestBytes) continue;

    selectedEntries.push(candidate.entry);
    selectedBytes += candidate.entry.size;

    if (!isPriority) {
      topLevelCounts.set(topLevelDirectory, topLevelCount + 1);
    }
  }

  return selectedEntries;
};

const getLanguageLabel = (path: string) =>
  LANGUAGE_LABELS.get(getExtension(path)) ?? "Other";

const buildLanguageStats = (tree: GitHubTreeEntry[]) => {
  const stats = new Map<string, LanguageStat>();

  for (const entry of tree) {
    if (
      entry.type !== "blob" ||
      isGeneratedPath(entry.path) ||
      isLockFilePath(entry.path)
    ) {
      continue;
    }

    const label = getLanguageLabel(entry.path);
    const currentStat = stats.get(label) ?? { label, files: 0, bytes: 0 };
    stats.set(label, {
      label,
      files: currentStat.files + 1,
      bytes: currentStat.bytes + entry.size,
    });
  }

  return [...stats.values()].sort(
    (leftStat, rightStat) =>
      rightStat.bytes - leftStat.bytes ||
      leftStat.label.localeCompare(rightStat.label),
  );
};

const formatRepositoryMetadata = (
  repository: RepositoryDigest["repository"],
  languageStats: LanguageStat[],
) =>
  JSON.stringify(
    {
      ...repository,
      languageStats,
    },
    null,
    2,
  );

const formatTreeEntry = (entry: GitHubTreeEntry) => {
  const suffix = entry.type === "tree" ? "/" : ` (${entry.size} bytes)`;
  return `- ${entry.path}${suffix}`;
};

const formatFileTree = (
  tree: GitHubTreeEntry[],
  maxTreeEntries: number,
  isGitHubTreeTruncated: boolean,
) => {
  const visibleEntries = tree.slice(0, maxTreeEntries);
  const omittedCount = Math.max(tree.length - visibleEntries.length, 0);
  const lines = visibleEntries.map(formatTreeEntry);

  if (omittedCount > 0) {
    lines.push(`- ... ${omittedCount} more entries omitted from digest`);
  }

  if (isGitHubTreeTruncated) {
    lines.push("- GitHub marked this recursive tree response as truncated");
  }

  return lines.join("\n");
};

const addLineNumbers = (content: string, maxLines: number) => {
  const lines = content.split(/\r?\n/);
  const visibleLines = lines.slice(0, maxLines);
  const numberedLines = visibleLines.map(
    (line, lineIndex) => `${lineIndex + 1}: ${line}`,
  );

  if (lines.length > visibleLines.length) {
    numberedLines.push(`... truncated after line ${visibleLines.length}`);
  }

  return {
    lineEnd: visibleLines.length,
    content: numberedLines.join("\n"),
  };
};

const toDigestFileExcerpt = (
  file: RepositoryFile,
  maxLinesPerFile: number,
): DigestFileExcerpt => {
  const excerpt = addLineNumbers(file.content, maxLinesPerFile);

  return {
    path: file.path,
    sha: file.sha,
    size: file.size,
    reason: getSelectionReason(file.path),
    lineStart: 1,
    lineEnd: excerpt.lineEnd,
    content: excerpt.content,
  };
};

const formatFileExcerpt = (excerpt: DigestFileExcerpt) =>
  [
    `--- ${excerpt.path} (${excerpt.reason}, lines ${excerpt.lineStart}-${excerpt.lineEnd}, ${excerpt.size} bytes)`,
    excerpt.content,
  ].join("\n");

const formatFileExcerpts = (excerpts: DigestFileExcerpt[]) =>
  excerpts.length === 0
    ? "No source excerpts were selected."
    : excerpts.map(formatFileExcerpt).join("\n\n");

const getByteLength = (value: string) => Buffer.byteLength(value, "utf8");

export const renderRepoAnalyserPrompt = (sections: PromptDigestSections) =>
  repoAnalyserPrompt
    .replace("{{REPO_METADATA}}", sections.repoMetadata)
    .replace("{{FILE_TREE}}", sections.fileTree)
    .replace("{{FILE_EXCERPTS}}", sections.fileExcerpts);

export const buildRepositoryDigest = async (
  repoUrl: string,
  options: RepositoryDigestOptions = {},
): Promise<RepositoryDigest> => {
  const repositoryTree = await fetchRepositoryTree(repoUrl, options);
  const languageStats = buildLanguageStats(repositoryTree.tree);
  const selectedTargets = selectDigestTargets(repositoryTree.tree, options);
  const selectedFiles = await fetchGitHubFiles(
    repositoryTree.reference,
    selectedTargets,
    options,
  );
  const maxLinesPerFile = options.maxLinesPerFile ?? DEFAULT_MAX_LINES_PER_FILE;
  const excerpts = selectedFiles.map((file) =>
    toDigestFileExcerpt(file, maxLinesPerFile),
  );
  const maxTreeEntries = options.maxTreeEntries ?? DEFAULT_MAX_TREE_ENTRIES;
  const repoMetadata = formatRepositoryMetadata(
    repositoryTree.repository,
    languageStats,
  );
  const fileTree = formatFileTree(
    repositoryTree.tree,
    maxTreeEntries,
    repositoryTree.truncated,
  );
  const fileExcerpts = formatFileExcerpts(excerpts);
  const prompt = renderRepoAnalyserPrompt({
    repoMetadata,
    fileTree,
    fileExcerpts,
  });

  return {
    repository: repositoryTree.repository,
    repoMetadata,
    fileTree,
    fileExcerpts,
    selectedFiles: excerpts,
    prompt,
    stats: {
      filesInTree: repositoryTree.tree.filter((entry) => entry.type === "blob")
        .length,
      filesSelected: excerpts.length,
      digestBytes:
        getByteLength(repoMetadata) +
        getByteLength(fileTree) +
        getByteLength(fileExcerpts),
      promptBytes: getByteLength(prompt),
      treeEntriesShown: Math.min(repositoryTree.tree.length, maxTreeEntries),
      treeTruncatedByGitHub: repositoryTree.truncated,
      languageStats,
    },
  };
};
