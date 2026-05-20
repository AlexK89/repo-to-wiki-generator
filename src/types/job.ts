import type { WikiRepo } from "./wiki";

export type AnalyzeJobStatus =
  | "analyzing"
  | "writing"
  | "completed"
  | "failed";

export type AnalyzeJobPhase = "fetch" | "analyze" | "write" | "finalize";

export type AnalyzeJobPublic = {
  id: string;
  repoUrl: string;
  status: AnalyzeJobStatus;
  phase: AnalyzeJobPhase;
  progress: number;
  message: string;
  featuresFound: number;
  pagesDone: number;
  totalPages: number;
  createdAt: string;
  updatedAt: string;
  wikiId?: string;
  error?: string;
  finishedAt?: string;
  repo?: Pick<WikiRepo, "owner" | "name" | "sha" | "defaultBranch">;
  openaiResponseId?: string;
};
