import type { ApiHandler } from "../src/lib/server/http";
import {
  getErrorMessage,
  getRequestUrl,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../src/lib/server/http";
import { buildRepositoryDigest } from "../src/lib/server/github/digest";
import {
  startAnalyzeJob,
  toPublicAnalyzeJob,
} from "../src/lib/server/jobs/analyze-job";

const DEFAULT_DIGEST_REPO_URL = "https://github.com/Textualize/rich-cli";

type AnalyzeRequestBody = {
  url?: string;
};

const handler: ApiHandler = async (request, response) => {
  if (request.method === "POST") {
    try {
      const body = await readJsonBody<AnalyzeRequestBody>(request);
      const repoUrl = body.url?.trim();

      if (!repoUrl) {
        sendJson(response, 400, { error: "A GitHub repository URL is required." });
        return;
      }

      const job = await startAnalyzeJob(repoUrl);
      sendJson(response, job.status === "completed" ? 200 : 202, {
        job: toPublicAnalyzeJob(job),
      });
    } catch (error) {
      sendJson(response, 500, {
        error: getErrorMessage(error),
      });
    }
    return;
  }

  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET", "POST"]);
    return;
  }

  const requestUrl = getRequestUrl(request);
  const repoUrl = requestUrl.searchParams.get("url") ?? DEFAULT_DIGEST_REPO_URL;
  const includePrompt = requestUrl.searchParams.get("includePrompt") === "1";

  try {
    const digest = await buildRepositoryDigest(repoUrl, {
      token: process.env.GITHUB_TOKEN,
    });

    sendJson(response, 200, {
      mode: "digest-preview",
      repo: digest.repository,
      stats: digest.stats,
      digest: {
        repoMetadata: digest.repoMetadata,
        fileTree: digest.fileTree,
        fileExcerpts: digest.fileExcerpts,
        ...(includePrompt ? { prompt: digest.prompt } : {}),
      },
    });
  } catch (error) {
    sendJson(response, 500, {
      error: getErrorMessage(error),
      repoUrl,
    });
  }
};

export const config = { maxDuration: 300 };

export default handler;
