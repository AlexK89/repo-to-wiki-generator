import type {
  Analysis,
  AnalysisDiscovery,
  AnalysisSubsystem,
  SubsystemDeepDive,
} from "@/types/analysis";
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
  createDeepDivePrompt,
  mergeDiscoveryWithDeepDives,
  parseDeepDiveOutput,
} from "../llm/deepdive-runner";
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
import { repoAnalyserDiscoveryPrompt } from "@/prompts/repo-analyser-discovery";
import { renderPrompt } from "../llm/render-prompt";
import { analysisDiscoverySchema } from "../llm/zod-schemas";

type PageResponseRequest = {
  subsystemId: string;
  responseId: string;
  evidenceFiles: DigestFileExcerpt[];
  retries?: number;
};

type DeepDiveResponseRequest = {
  subsystemId: string;
  responseId: string;
  retries?: number;
};

const MAX_PAGE_RETRIES = 1;
const MAX_DEEP_DIVE_RETRIES = 1;
const DISCOVERY_TIMEOUT_MS = 90_000;
const DEEP_DIVE_TIMEOUT_MS = 120_000;
const ANALYSIS_TIMEOUT_MS = DISCOVERY_TIMEOUT_MS + DEEP_DIVE_TIMEOUT_MS;
const WRITING_TIMEOUT_MS = 6 * 60 * 1000;

type AnalysisStage = "discovery" | "deep-dive";

type AnalyzeJobData = {
  startedAt: number;
  digest?: RepositoryDigest;
  analysisStage?: AnalysisStage;
  discovery?: AnalysisDiscovery;
  deepDiveRequests?: DeepDiveResponseRequest[];
  deepDivesDone?: number;
  totalDeepDives?: number;
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

type DeepDiveResponseResult = {
  request: DeepDiveResponseRequest;
  response: BackgroundJsonResponse;
};

const DISCOVERY_INSTRUCTIONS =
  "Return only the repository discovery JSON. Prefer user-facing feature names over technical layer names.";

const DEEP_DIVE_INSTRUCTIONS =
  "Return only the subsystem deep-dive JSON. Every behaviour and public interface must cite a real file:line range.";

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

const getFeaturesFound = (data: AnalyzeJobData) =>
  data.analysis?.subsystems.length ??
  data.discovery?.subsystems.length ??
  0;

const getMessage = (job: AnalyzeJobRow, data: AnalyzeJobData) => {
  if (job.status === "failed") return job.error ?? "Generation failed.";
  if (job.status === "completed") return "Wiki ready.";
  if (job.status === "writing") {
    return `Writing cited pages ${data.pagesDone ?? 0}/${getTotalPages(data)}.`;
  }
  if (data.analysisStage === "deep-dive") {
    return `Researching ${data.deepDivesDone ?? 0}/${data.totalDeepDives ?? 0} features in parallel.`;
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
    featuresFound: getFeaturesFound(data),
    pagesDone:
      job.status === "completed" ? totalPages : data.pagesDone ?? 0,
    totalPages,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    wikiId: job.wikiId ?? undefined,
    error: job.error ?? undefined,
    finishedAt: job.finishedAt ?? undefined,
    repo: getRepoFromDigest(data.digest),
    openaiResponseId: job.openaiResponseId ?? undefined,
  };
};

const createDiscoveryResponse = async (
  digest: RepositoryDigest,
  isRepair: boolean,
  guardResult?: { offendingSubsystems: string[] },
) => {
  const basePrompt = renderPrompt(repoAnalyserDiscoveryPrompt, {
    REPO_METADATA: digest.repoMetadata,
    FILE_TREE: digest.fileTree,
    FILE_EXCERPTS: digest.fileExcerpts,
  });
  const prompt =
    isRepair && guardResult
      ? buildGenericRepairPrompt(basePrompt, {
          hasGenericSubsystems: true,
          offendingSubsystems: guardResult.offendingSubsystems,
        })
      : basePrompt;

  return createBackgroundJsonResponse({
    prompt,
    instructions: DISCOVERY_INSTRUCTIONS,
    maxOutputTokens: 5_000,
    metadata: {
      kind: isRepair ? "repository-discovery-repair" : "repository-discovery",
      repo: digest.repository.fullName,
      sha: digest.repository.sha.slice(0, 40),
    },
  });
};

const createDeepDiveRequests = async (
  discovery: AnalysisDiscovery,
  digest: RepositoryDigest,
): Promise<DeepDiveResponseRequest[]> =>
  Promise.all(
    discovery.subsystems.map(async (subsystem) => {
      const deepDivePrompt = createDeepDivePrompt(subsystem, digest);
      const response = await createBackgroundJsonResponse({
        prompt: deepDivePrompt.prompt,
        instructions: DEEP_DIVE_INSTRUCTIONS,
        maxOutputTokens: 3_000,
        metadata: {
          kind: "subsystem-deep-dive",
          repo: digest.repository.fullName,
          subsystem: subsystem.id.slice(0, 64),
        },
      });

      return {
        subsystemId: subsystem.id,
        responseId: response.responseId,
      };
    }),
  );

const retryFailedDeepDive = async (
  request: DeepDiveResponseRequest,
  discovery: AnalysisDiscovery,
  digest: RepositoryDigest,
): Promise<DeepDiveResponseRequest> => {
  const subsystem = discovery.subsystems.find(
    (candidate) => candidate.id === request.subsystemId,
  );
  if (!subsystem) {
    throw new Error(
      `Cannot retry deep-dive: subsystem ${request.subsystemId} missing from discovery`,
    );
  }

  const deepDivePrompt = createDeepDivePrompt(subsystem, digest);
  const response = await createBackgroundJsonResponse({
    prompt: deepDivePrompt.prompt,
    instructions: DEEP_DIVE_INSTRUCTIONS,
    maxOutputTokens: 4_000,
    metadata: {
      kind: "subsystem-deep-dive-retry",
      repo: digest.repository.fullName,
      subsystem: request.subsystemId.slice(0, 64),
    },
  });

  return {
    subsystemId: request.subsystemId,
    responseId: response.responseId,
    retries: (request.retries ?? 0) + 1,
  };
};

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

  const response = await createDiscoveryResponse(digest, false);

  return createAnalyzeJob({
    repoUrl: canonicalRepoUrl,
    status: "analyzing",
    phase: "analyze",
    progress: 35,
    openaiResponseId: response.responseId,
    data: {
      startedAt,
      digest,
      analysisStage: "discovery",
    } satisfies AnalyzeJobData,
  });
};

const advanceDiscoveryStage = async (job: AnalyzeJobRow) => {
  const data = getJobData(job);
  const digest = data.digest;

  if (!digest || !job.openaiResponseId) {
    throw new Error("Discovery job is missing digest or OpenAI response id");
  }

  const response = await retrieveBackgroundJsonResponse(job.openaiResponseId);
  console.log(
    `[analyze-job ${job.id.slice(0, 8)}] discovery openai=${response.responseId.slice(0, 16)} status=${response.status}${response.errorMessage ? ` err="${response.errorMessage}"` : ""}`,
  );
  const terminalError = getOpenAITerminalError(response);

  if (terminalError) throw new Error(terminalError);
  if (isPendingOpenAIStatus(response.status)) return job;

  const discovery = parseStructuredJson(
    analysisDiscoverySchema,
    response.outputText,
  );
  const guardResult = detectGenericSubsystems(discovery);

  if (guardResult.hasGenericSubsystems && !data.repairAttempted) {
    console.log(
      `[analyze-job ${job.id.slice(0, 8)}] generic-slug repair: ${guardResult.offendingSubsystems.join(", ")}`,
    );
    const repairResponse = await createDiscoveryResponse(
      digest,
      true,
      guardResult,
    );

    return updateAnalyzeJob(
      job,
      {
        progress: 40,
        openaiResponseId: repairResponse.responseId,
        data: {
          ...data,
          repairAttempted: true,
        } satisfies AnalyzeJobData,
      },
      { force: true },
    );
  }

  const deepDiveRequests = await createDeepDiveRequests(discovery, digest);
  console.log(
    `[analyze-job ${job.id.slice(0, 8)}] fanned out ${deepDiveRequests.length} deep-dives`,
  );

  return updateAnalyzeJob(
    job,
    {
      progress: 45,
      openaiResponseId: null,
      data: {
        ...data,
        analysisStage: "deep-dive",
        discovery,
        deepDiveRequests,
        deepDivesDone: 0,
        totalDeepDives: deepDiveRequests.length,
      } satisfies AnalyzeJobData,
    },
    { force: true },
  );
};

const retrieveDeepDiveResponses = async (
  deepDiveRequests: DeepDiveResponseRequest[],
): Promise<DeepDiveResponseResult[]> =>
  Promise.all(
    deepDiveRequests.map(async (request) => ({
      request,
      response: await retrieveBackgroundJsonResponse(request.responseId),
    })),
  );

const advanceDeepDiveStage = async (job: AnalyzeJobRow) => {
  const data = getJobData(job);
  const { digest, discovery, deepDiveRequests } = data;

  if (!digest || !discovery || !deepDiveRequests) {
    throw new Error(
      "Deep-dive job is missing digest, discovery, or deep-dive requests",
    );
  }

  const responses = await retrieveDeepDiveResponses(deepDiveRequests);
  const nextRequests = [...deepDiveRequests];
  let didRetry = false;
  let permanentlyFailed: DeepDiveResponseResult | null = null;

  for (let index = 0; index < responses.length; index += 1) {
    const result = responses[index];
    if (!result) continue;
    const terminalError = getOpenAITerminalError(result.response);
    if (!terminalError) continue;

    const attempt = result.request.retries ?? 0;
    if (attempt >= MAX_DEEP_DIVE_RETRIES) {
      permanentlyFailed = result;
      break;
    }

    nextRequests[index] = await retryFailedDeepDive(
      result.request,
      discovery,
      digest,
    );
    responses[index] = {
      request: nextRequests[index],
      response: {
        responseId: nextRequests[index].responseId,
        status: "queued",
        outputText: "",
      },
    };
    didRetry = true;
  }

  if (permanentlyFailed) {
    throw new Error(
      getOpenAITerminalError(permanentlyFailed.response) ??
        `Deep-dive ${permanentlyFailed.request.subsystemId} failed`,
    );
  }

  const completed = responses.filter(
    ({ response }) => response.status === "completed",
  );
  const deepDivesDone = completed.length;

  if (didRetry || deepDivesDone < deepDiveRequests.length) {
    return updateAnalyzeJob(
      job,
      {
        progress:
          45 + Math.round((deepDivesDone / deepDiveRequests.length) * 15),
        data: {
          ...data,
          deepDiveRequests: nextRequests,
          deepDivesDone,
        } satisfies AnalyzeJobData,
      },
      { force: true },
    );
  }

  const deepDives: SubsystemDeepDive[] = completed.map(({ request, response }) =>
    parseDeepDiveOutput(request.subsystemId, response.outputText),
  );
  const analysis = mergeDiscoveryWithDeepDives(discovery, deepDives);
  const pageRequests = await createPageRequests(analysis, digest);

  console.log(
    `[analyze-job ${job.id.slice(0, 8)}] all deep-dives complete, writing ${pageRequests.length} pages`,
  );

  return updateAnalyzeJob(
    job,
    {
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
        deepDivesDone: deepDiveRequests.length,
      } satisfies AnalyzeJobData,
    },
    { force: true },
  );
};

const advanceAnalyzingJob = async (job: AnalyzeJobRow) => {
  const data = getJobData(job);
  if (data.analysisStage === "deep-dive") {
    return advanceDeepDiveStage(job);
  }
  return advanceDiscoveryStage(job);
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
      response: {
        responseId: nextRequests[index].responseId,
        status: "queued",
        outputText: "",
      },
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
    return updateAnalyzeJob(
      job,
      {
        progress: 60 + Math.round((pagesDone / pageRequests.length) * 30),
        data: {
          ...data,
          pageRequests: nextRequests,
          pagesDone,
        } satisfies AnalyzeJobData,
      },
      { force: true },
    );
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

  return updateAnalyzeJob(
    job,
    {
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
    },
    { force: true },
  );
};

const failJob = (job: AnalyzeJobRow, error: unknown) => {
  console.log(
    `[analyze-job ${job.id.slice(0, 8)}] FAIL "${getErrorMessage(error)}"`,
  );
  return updateAnalyzeJob(
    job,
    {
      status: "failed",
      phase: "finalize",
      progress: Math.max(job.progress, 95),
      error: getErrorMessage(error),
      finishedAt: new Date().toISOString(),
    },
    { force: true },
  );
};

export const advanceAnalyzeJob = async (
  jobId: string,
): Promise<AnalyzeJobRow | null> => {
  const existing = await getAnalyzeJob(jobId);

  if (!existing) return null;
  if (existing.status === "completed" || existing.status === "failed") {
    return existing;
  }

  const job = await claimAnalyzeJob(jobId);
  if (!job) {
    console.log(
      `[analyze-job ${jobId.slice(0, 8)}] claim skipped (recently updated), status=${existing.status}`,
    );
    return existing;
  }
  const data = getJobData(job);
  console.log(
    `[analyze-job ${jobId.slice(0, 8)}] advancing status=${job.status} phase=${job.phase} stage=${data.analysisStage ?? "-"}`,
  );

  const createdAtMs = new Date(job.createdAt).getTime();
  const elapsedMs = Date.now() - createdAtMs;
  const phaseTimeoutMs =
    job.status === "writing" ? WRITING_TIMEOUT_MS : ANALYSIS_TIMEOUT_MS;

  if (Number.isFinite(elapsedMs) && elapsedMs > phaseTimeoutMs) {
    return failJob(
      job,
      new Error(
        `Job stuck in '${job.status}' phase for ${Math.round(elapsedMs / 1000)}s — gpt-5-mini did not return in time`,
      ),
    );
  }

  try {
    if (job.status === "analyzing") return await advanceAnalyzingJob(job);
    return await advanceWritingJob(job);
  } catch (error) {
    return failJob(job, error);
  }
};
