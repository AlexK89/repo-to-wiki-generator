import { fetchGitHubJson } from "./tree";
import type {
  GitHubFetchOptions,
  GitHubRepositoryReference,
  GitHubTreeEntry,
} from "./tree";

const TEXT_EXTENSIONS = new Set([
  ".astro",
  ".c",
  ".cc",
  ".cfg",
  ".clj",
  ".cpp",
  ".cs",
  ".css",
  ".env",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".lua",
  ".md",
  ".mdx",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
]);

const TEXT_FILE_NAMES = new Set([
  ".env.example",
  ".gitignore",
  "dockerfile",
  "gemfile",
  "license",
  "makefile",
  "package-lock.json",
  "package.json",
  "pipfile",
  "procfile",
  "pyproject.toml",
  "readme",
  "readme.md",
  "requirements.txt",
]);

const LOCK_FILE_NAMES = new Set([
  "bun.lock",
  "cargo.lock",
  "composer.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "yarn.lock",
]);

const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avif",
  ".bmp",
  ".eot",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".lockb",
  ".mov",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".tar",
  ".tgz",
  ".ttf",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const GENERATED_FILE_PATTERNS = [
  /(^|\/)__snapshots__\//,
  /(^|\/)\.cache\//,
  /(^|\/)\.pytest_cache\//,
  /(^|\/)generated\//,
  /(^|\/)snapshots\//,
  /\.generated\./,
  /\.min\.(css|js)$/,
];

export type RepositoryFile = {
  path: string;
  sha: string;
  size: number;
  content: string;
};

export type FileFilterOptions = {
  maxFileBytes?: number;
};

export type FileFetchOptions = GitHubFetchOptions & FileFilterOptions;

type GitHubBlobResponse = {
  sha: string;
  size: number;
  encoding: string;
  content: string;
};

const getPathSegments = (path: string) => path.split("/").filter(Boolean);

const getFileName = (path: string) => getPathSegments(path).at(-1) ?? path;

const getLowerFileName = (path: string) => getFileName(path).toLowerCase();

const getExtension = (path: string) => {
  const fileName = getLowerFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
};

const hasSkippedDirectory = (path: string) =>
  getPathSegments(path).some((segment) =>
    SKIPPED_DIRECTORY_NAMES.has(segment.toLowerCase()),
  );

const decodeBlobContent = (blob: GitHubBlobResponse) => {
  if (blob.encoding !== "base64") {
    throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}`);
  }

  return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
};

export const getTopLevelDirectory = (path: string) =>
  getPathSegments(path)[0] ?? ".";

export const isLockFilePath = (path: string) =>
  LOCK_FILE_NAMES.has(getLowerFileName(path));

export const isGeneratedPath = (path: string) =>
  hasSkippedDirectory(path) ||
  GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(path));

export const isBinaryPath = (path: string) =>
  BINARY_EXTENSIONS.has(getExtension(path));

export const isLikelyTextPath = (path: string) =>
  TEXT_EXTENSIONS.has(getExtension(path)) ||
  TEXT_FILE_NAMES.has(getLowerFileName(path));

export const isDigestCandidate = (
  entry: GitHubTreeEntry,
  options: FileFilterOptions = {},
) => {
  const maxFileBytes = options.maxFileBytes ?? 140_000;

  return (
    entry.type === "blob" &&
    entry.size > 0 &&
    entry.size <= maxFileBytes &&
    !isLockFilePath(entry.path) &&
    !isGeneratedPath(entry.path) &&
    !isBinaryPath(entry.path) &&
    isLikelyTextPath(entry.path)
  );
};

export const fetchGitHubFile = async (
  reference: GitHubRepositoryReference,
  entry: GitHubTreeEntry,
  options: FileFetchOptions = {},
): Promise<RepositoryFile> => {
  const blobUrl =
    entry.url ||
    `https://api.github.com/repos/${reference.owner}/${reference.repo}/git/blobs/${entry.sha}`;
  const blob = await fetchGitHubJson<GitHubBlobResponse>(blobUrl, options);

  return {
    path: entry.path,
    sha: blob.sha,
    size: blob.size,
    content: decodeBlobContent(blob),
  };
};

export const fetchGitHubFiles = async (
  reference: GitHubRepositoryReference,
  entries: GitHubTreeEntry[],
  options: FileFetchOptions = {},
) =>
  Promise.all(
    entries.map((entry) => fetchGitHubFile(reference, entry, options)),
  );
