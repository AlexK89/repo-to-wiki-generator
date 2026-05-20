const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "cubic-wiki-generator";

export type GitHubRepositoryReference = {
  owner: string;
  repo: string;
  repoUrl: string;
};

export type GitHubRepositoryMetadata = {
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

export type GitHubTreeEntryType = "blob" | "tree";

export type GitHubTreeEntry = {
  path: string;
  type: GitHubTreeEntryType;
  sha: string;
  size: number;
  url: string;
};

export type RepositoryTree = {
  reference: GitHubRepositoryReference;
  repository: GitHubRepositoryMetadata;
  tree: GitHubTreeEntry[];
  truncated: boolean;
  fetchedAt: string;
};

export type GitHubFetchOptions = {
  token?: string;
};

type GitHubLicenseResponse = {
  spdx_id?: string | null;
};

type GitHubRepositoryResponse = {
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  license: GitHubLicenseResponse | null;
};

type GitHubBranchResponse = {
  commit: {
    sha: string;
  };
};

type GitHubTreeApiEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
};

type GitHubTreeResponse = {
  truncated: boolean;
  tree: GitHubTreeApiEntry[];
};

const createGitHubHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": GITHUB_USER_AGENT,
    "x-github-api-version": GITHUB_API_VERSION,
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
};

const getRepositoryApiUrl = (reference: GitHubRepositoryReference) =>
  `${GITHUB_API_BASE_URL}/repos/${reference.owner}/${reference.repo}`;

const getBranchApiUrl = (
  reference: GitHubRepositoryReference,
  defaultBranch: string,
) =>
  `${getRepositoryApiUrl(reference)}/branches/${encodeURIComponent(defaultBranch)}`;

const getTreeApiUrl = (reference: GitHubRepositoryReference, sha: string) =>
  `${getRepositoryApiUrl(reference)}/git/trees/${sha}?recursive=1`;

const readGitHubError = async (response: Response) => {
  const fallbackMessage = `${response.status} ${response.statusText}`;

  try {
    const body = (await response.json()) as { message?: string };
    return body.message ? `${fallbackMessage}: ${body.message}` : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const normalizeRepositoryPath = (repoUrl: string) =>
  repoUrl.trim().replace(/\.git$/, "");

const assertRepositoryParts = (owner: string | undefined, repo: string | undefined) => {
  if (!owner || !repo) {
    throw new Error("Expected a GitHub repository URL like https://github.com/owner/repo");
  }
};

const normalizeRepositoryReference = (
  owner: string,
  repo: string,
): GitHubRepositoryReference => ({
  owner,
  repo,
  repoUrl: `https://github.com/${owner}/${repo}`,
});

const isSupportedGitHubHost = (host: string) =>
  host === "github.com" || host === "www.github.com";

const isBlobOrTree = (type: string | undefined): type is GitHubTreeEntryType =>
  type === "blob" || type === "tree";

const toTreeEntry = (entry: GitHubTreeApiEntry): GitHubTreeEntry | null => {
  if (!entry.path || !entry.sha || !isBlobOrTree(entry.type)) {
    return null;
  }

  return {
    path: entry.path,
    type: entry.type,
    sha: entry.sha,
    size: entry.size ?? 0,
    url: entry.url ?? "",
  };
};

const toRepositoryMetadata = (
  reference: GitHubRepositoryReference,
  repository: GitHubRepositoryResponse,
  sha: string,
): GitHubRepositoryMetadata => ({
  owner: reference.owner,
  name: repository.name,
  fullName: repository.full_name,
  defaultBranch: repository.default_branch,
  description: repository.description,
  htmlUrl: repository.html_url,
  stars: repository.stargazers_count,
  primaryLanguage: repository.language,
  license: repository.license?.spdx_id ?? null,
  sha,
});

export const parseGitHubRepositoryUrl = (
  repoUrl: string,
): GitHubRepositoryReference => {
  const normalizedRepositoryPath = normalizeRepositoryPath(repoUrl);

  if (/^[\w.-]+\/[\w.-]+$/.test(normalizedRepositoryPath)) {
    const [owner, repo] = normalizedRepositoryPath.split("/");
    assertRepositoryParts(owner, repo);
    return normalizeRepositoryReference(owner, repo);
  }

  const parsedUrl = new URL(normalizedRepositoryPath);

  if (!isSupportedGitHubHost(parsedUrl.hostname)) {
    throw new Error("Only github.com repository URLs are supported");
  }

  const [owner, repo] = parsedUrl.pathname.split("/").filter(Boolean);
  assertRepositoryParts(owner, repo);

  return normalizeRepositoryReference(owner, repo);
};

export const fetchGitHubJson = async <ResponseJson>(
  url: string,
  options: GitHubFetchOptions = {},
) => {
  const response = await fetch(url, {
    headers: createGitHubHeaders(options.token),
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response));
  }

  return (await response.json()) as ResponseJson;
};

export const fetchRepositoryTree = async (
  repoUrl: string,
  options: GitHubFetchOptions = {},
): Promise<RepositoryTree> => {
  const reference = parseGitHubRepositoryUrl(repoUrl);
  const repository = await fetchGitHubJson<GitHubRepositoryResponse>(
    getRepositoryApiUrl(reference),
    options,
  );
  const branch = await fetchGitHubJson<GitHubBranchResponse>(
    getBranchApiUrl(reference, repository.default_branch),
    options,
  );
  const repositoryTree = await fetchGitHubJson<GitHubTreeResponse>(
    getTreeApiUrl(reference, branch.commit.sha),
    options,
  );
  const tree = repositoryTree.tree
    .map(toTreeEntry)
    .filter((entry): entry is GitHubTreeEntry => entry !== null)
    .sort((leftEntry, rightEntry) =>
      leftEntry.path.localeCompare(rightEntry.path),
    );

  return {
    reference,
    repository: toRepositoryMetadata(reference, repository, branch.commit.sha),
    tree,
    truncated: repositoryTree.truncated,
    fetchedAt: new Date().toISOString(),
  };
};
