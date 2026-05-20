import type { Analysis, AnalysisSubsystem } from "@/types/analysis";
import type { AnalyzeJobPublic } from "@/types/job";
import { buildRepositoryDigest } from "../github/digest";
import type { DigestFileExcerpt, RepositoryDigest } from "../github/digest";
import {
  claimAnalyzeJob,
  createAnalyzeJob,
  getAnalyzeJob,
  updateAnalyzeJob,
} from "../db/jobs";
import type { AnalyzeJobRow } from "../db/jobs";
import { findWikiByRepoSha, upsertWiki } from "../db/wikis";
import { assembleWiki } from "../llm/assemble-wiki";
import {
  buildGenericRepairPrompt,
  detectGenericSubsystems,
} from "../llm/analysis-runner";
import {
  createBackgroundJsonResponse,
  parseStructuredJson,
  retrieveBackgroundJsonResponse,
} from "../llm/openai";
import type {
  BackgroundJsonResponse,
  BackgroundJsonResponseStatus,
} from "../llm/openai";
import {
  createSubsystemPagePrompt,
  parseSubsystemPageOutput,
} from "../llm/page-runner";
import { analysisSchema } from "../llm/zod-schemas";

type PageResponseRequest = {
  subsystemId: string;
  responseId: string;
  evidenceFiles: DigestFileExcerpt[];
  retries?: number;
};

const MAX_PAGE_RETRIES = 1;
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

type AnalyzeJobData = {
  startedAt: number;
  digest?: RepositoryDigest;
  analysis?: Analysis;
  pageRequests?: PageResponseRequest[];
  pagesDone?: number;
  totalPages?: number;
  repairAttempted?: boolean;
};

type PageResponseResult = {
  request: PageResponseRequest;
  response: BackgroundJsonResponse;
};

const ANALYSIS_INSTRUCTIONS =
  "Return only the repository analysis JSON. Prefer feature and workflow names over technical layer names.";

const FEATURE_PAGE_INSTRUCTIONS =
  "Return only the feature page JSON. Every concrete implementation claim needs a validated source citation.";

const PENDING_OPENAI_STATUSES: BackgroundJsonResponseStatus[] = [
  "queued",
  "in_progress",
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown analysis job error";

const getJobData = (job: AnalyzeJobRow): AnalyzeJobData =>
  job.data as unknown as AnalyzeJobData;

const isPendingOpenAIStatus = (status: BackgroundJsonResponseStatus) =>
  PENDING_OPENAI_STATUSES.includes(status);

const getOpenAITerminalError = (response: BackgroundJsonResponse) => {
  if (response.status === "completed") return null;
  if (isPendingOpenAIStatus(response.status)) return null;

  return (
    response.errorMessage ??
    `OpenAI response ${response.responseId} ended with status ${response.status}`
  );
};

const getRepoFromDigest = (digest: RepositoryDigest | undefined) => {
  if (!digest) return undefined;

  return {
    owner: digest.repository.owner,
    name: digest.repository.name,
    sha: digest.repository.sha,
    defaultBranch: digest.repository.defaultBranch,
  };
};

const getTotalPages = (data: AnalyzeJobData) =>
  data.analysis?.subsystems.length ??
  data.pageRequests?.length ??
  data.totalPages ??
  data.pagesDone ??
  0;

const getMessage = (job: AnalyzeJobRow, data: AnalyzeJobData) => {
  if (job.status === "failed") return job.error ?? "Generation failed.";
  if (job.status === "completed") return "Wiki ready.";
  if (job.status === "writing") {
    return `Writing cited pages ${data.pagesDone ?? 0}/${getTotalPages(data)}.`;
  }

  return "Identifying user-facing features with gpt-5-mini.";
};

export const toPublicAnalyzeJob = (
  job: AnalyzeJobRow,
): AnalyzeJobPublic => {
  const data = getJobData(job);
  const totalPages = getTotalPages(data);

  return {
    id: job.id,
    repoUrl: job.repoUrl,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    message: getMessage(job, data),
    featuresFound: data.analysis?.subsystems.length ?? 0,
    pagesDone:
      job.status === "completed" ? totalPages : data.pagesDone ?? 0,
    totalPages,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    wikiId: job.wikiId ?? undefined,
    error: job.error ?? undefined,
    finishedAt: job.finishedAt ?? undefined,
    repo: getRepoFromDigest(data.digest),
  };
};

const createAnalysisResponse = async (digest: RepositoryDigest) =>
  createBackgroundJsonResponse({
    prompt: digest.prompt,
    instructions: ANALYSIS_INSTRUCTIONS,
    maxOutputTokens: 5_000,
    metadata: {
      kind: "repository-analysis",
      repo: digest.repository.fullName,
      sha: digest.repository.sha.slice(0, 40),
    },
  });

const createPageRequests = async (
  analysis: Analysis,
  digest: RepositoryDigest,
): Promise<PageResponseRequest[]> =>
  Promise.all(
    analysis.subsystems.map(async (subsystem) => {
      const pagePrompt = createSubsystemPagePrompt(subsystem, digest);
      const response = await createBackgroundJsonResponse({
        prompt: pagePrompt.prompt,
        instructions: FEATURE_PAGE_INSTRUCTIONS,
        maxOutputTokens: 4_000,
        metadata: {
          kind: "feature-page",
          repo: digest.repository.fullName,
          subsystem: subsystem.id.slice(0, 64),
        },
      });

      return {
        subsystemId: pagePrompt.subsystemId,
        responseId: response.responseId,
        evidenceFiles: pagePrompt.evidenceFiles,
      };
    }),
  );

const getSubsystem = (
  analysis: Analysis,
  subsystemId: string,
): AnalysisSubsystem => {
  const subsystem = analysis.subsystems.find(
    (candidate) => candidate.id === subsystemId,
  );

  if (!subsystem) {
    throw new Error(`Subsystem ${subsystemId} is missing from analysis`);
  }

  return subsystem;
};

const parseCompletedPages = (
  analysis: Analysis,
  pageResponses: PageResponseResult[],
) =>
  pageResponses.map(({ request, response }) =>
    parseSubsystemPageOutput({
      subsystem: getSubsystem(analysis, request.subsystemId),
      outputText: response.outputText,
      evidenceFiles: request.evidenceFiles,
    }),
  );

export const startAnalyzeJob = async (
  repoUrl: string,
): Promise<AnalyzeJobRow> => {
  const startedAt = Date.now();
  const digest = await buildRepositoryDigest(repoUrl, {
    token: process.env.GITHUB_TOKEN,
  });
  const canonicalRepoUrl = digest.repository.htmlUrl;
  const cachedWiki = await findWikiByRepoSha(
    canonicalRepoUrl,
    digest.repository.sha,
  );

  if (cachedWiki) {
    return createAnalyzeJob({
      repoUrl: canonicalRepoUrl,
      status: "completed",
      phase: "finalize",
      progress: 100,
      wikiId: cachedWiki.id,
      finishedAt: new Date().toISOString(),
      data: {
        startedAt,
        digest,
        pagesDone: cachedWiki.structure.features.length,
        totalPages: cachedWiki.structure.features.length,
      } satisfies AnalyzeJobData,
    });
  }

  const response = await createAnalysisResponse(digest);

  return createAnalyzeJob({
    repoUrl: canonicalRepoUrl,
    status: "analyzing",
    phase: "analyze",
    progress: 35,
    openaiResponseId: response.responseId,
    data: {
      startedAt,
      digest,
    } satisfies AnalyzeJobData,
  });
};

const advanceAnalyzingJob = async (job: AnalyzeJobRow) => {
  const data = getJobData(job);
  const digest = data.digest;

  if (!digest || !job.openaiResponseId) {
    throw new Error("Analysis job is missing digest or OpenAI response id");
  }

  const response = await retrieveBackgroundJsonResponse(job.openaiResponseId);
  const terminalError = getOpenAITerminalError(response);

  if (terminalError) throw new Error(terminalError);
  if (isPendingOpenAIStatus(response.status)) return job;

  const analysis = parseStructuredJson(analysisSchema, response.outputText);
  const guardResult = detectGenericSubsystems(analysis);

  if (guardResult.hasGenericSubsystems && !data.repairAttempted) {
    const repairResponse = await createBackgroundJsonResponse({
      prompt: buildGenericRepairPrompt(digest.prompt, guardResult),
      instructions: ANALYSIS_INSTRUCTIONS,
      maxOutputTokens: 5_000,
      metadata: {
        kind: "repository-analysis-repair",
        repo: digest.repository.fullName,
        sha: digest.repository.sha.slice(0, 40),
      },
    });

    return updateAnalyzeJob(job, {
      progress: 45,
      openaiResponseId: repairResponse.responseId,
      data: {
        ...data,
        repairAttempted: true,
      } satisfies AnalyzeJobData,
    });
  }

  const pageRequests = await createPageRequests(analysis, digest);

  return updateAnalyzeJob(job, {
    status: "writing",
    phase: "write",
    progress: 60,
    openaiResponseId: null,
    data: {
      ...data,
      analysis,
      pageRequests,
      pagesDone: 0,
      totalPages: pageRequests.length,
    } satisfies AnalyzeJobData,
  });
};

const retrievePageResponses = async (pageRequests: PageResponseRequest[]) =>
  Promise.all(
    pageRequests.map(async (request) => ({
      request,
      response: await retrieveBackgroundJsonResponse(request.responseId),
    })),
  );

const retryFailedPage = async (
  request: PageResponseRequest,
  analysis: Analysis,
  digest: RepositoryDigest,
): Promise<PageResponseRequest> => {
  const subsystem = getSubsystem(analysis, request.subsystemId);
  const pagePrompt = createSubsystemPagePrompt(subsystem, digest);
  const response = await createBackgroundJsonResponse({
    prompt: pagePrompt.prompt,
    instructions: FEATURE_PAGE_INSTRUCTIONS,
    maxOutputTokens: 4_000,
    metadata: {
      kind: "feature-page-retry",
      repo: digest.repository.fullName,
      subsystem: request.subsystemId.slice(0, 64),
    },
  });

  return {
    subsystemId: request.subsystemId,
    responseId: response.responseId,
    evidenceFiles: pagePrompt.evidenceFiles,
    retries: (request.retries ?? 0) + 1,
  };
};

const advanceWritingJob = async (job: AnalyzeJobRow) => {
  const data = getJobData(job);
  const { digest, analysis, pageRequests } = data;

  if (!digest || !analysis || !pageRequests) {
    throw new Error("Writing job is missing analysis, digest, or page requests");
  }

  const pageResponses = await retrievePageResponses(pageRequests);
  const nextRequests = [...pageRequests];
  let didRetry = false;
  let permanentlyFailed: PageResponseResult | null = null;

  for (let index = 0; index < pageResponses.length; index += 1) {
    const result = pageResponses[index];
    if (!result) continue;
    const terminalError = getOpenAITerminalError(result.response);
    if (!terminalError) continue;

    const attempt = result.request.retries ?? 0;
    if (attempt >= MAX_PAGE_RETRIES) {
      permanentlyFailed = result;
      break;
    }

    nextRequests[index] = await retryFailedPage(
      result.request,
      analysis,
      digest,
    );
    pageResponses[index] = {
      request: nextRequests[index],
      response: { responseId: nextRequests[index].responseId, status: "queued", outputText: "" },
    };
    didRetry = true;
  }

  if (permanentlyFailed) {
    throw new Error(
      getOpenAITerminalError(permanentlyFailed.response) ??
        `Page ${permanentlyFailed.request.subsystemId} failed`,
    );
  }

  const completedPages = pageResponses.filter(
    ({ response }) => response.status === "completed",
  );
  const pagesDone = completedPages.length;

  if (didRetry || pagesDone < pageRequests.length) {
    return updateAnalyzeJob(job, {
      progress: 60 + Math.round((pagesDone / pageRequests.length) * 30),
      data: {
        ...data,
        pageRequests: nextRequests,
        pagesDone,
      } satisfies AnalyzeJobData,
    });
  }

  const pages = parseCompletedPages(analysis, pageResponses);
  const wiki = assembleWiki({
    analysis,
    digest,
    pages,
    startedAt: data.startedAt,
  });
  const persistedWiki = await upsertWiki({
    repoUrl: digest.repository.htmlUrl,
    repoSha: digest.repository.sha,
    structure: wiki,
    analysis,
    digest,
  });

  return updateAnalyzeJob(job, {
    status: "completed",
    phase: "finalize",
    progress: 100,
    wikiId: persistedWiki.id,
    finishedAt: new Date().toISOString(),
    data: {
      ...data,
      pagesDone: pageRequests.length,
      totalPages: pageRequests.length,
    } satisfies AnalyzeJobData,
  });
};

const failJob = (job: AnalyzeJobRow, error: unknown) =>
  updateAnalyzeJob(job, {
    status: "failed",
    phase: "finalize",
    progress: Math.max(job.progress, 95),
    error: getErrorMessage(error),
    finishedAt: new Date().toISOString(),
  });

export const advanceAnalyzeJob = async (
  jobId: string,
): Promise<AnalyzeJobRow | null> => {
  const existing = await getAnalyzeJob(jobId);

  if (!existing) return null;
  if (existing.status === "completed" || existing.status === "failed") {
    return existing;
  }

  const job = await claimAnalyzeJob(jobId);
  if (!job) return existing;

  const data = getJobData(job);
  if (Date.now() - data.startedAt > JOB_TIMEOUT_MS) {
    return failJob(job, new Error("Analysis job timed out after 5 minutes"));
  }

  try {
    if (job.status === "analyzing") return await advanceAnalyzingJob(job);
    return await advanceWritingJob(job);
  } catch (error) {
    return failJob(job, error);
  }
};
