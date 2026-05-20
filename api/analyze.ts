import type { ApiHandler } from "../src/lib/server/http";
import {
  getErrorMessage,
  getRequestUrl,
  sendJson,
  sendMethodNotAllowed,
} from "../src/lib/server/http";
import { buildRepositoryDigest } from "../src/lib/server/github/digest";

const DEFAULT_DIGEST_REPO_URL = "https://github.com/Textualize/rich-cli";

const handler: ApiHandler = async (request, response) => {
  if (request.method === "POST") {
    sendJson(response, 501, {
      error: "SSE orchestration lands in Step 10. Use GET for the Step 8 digest preview.",
    });
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

export default handler;
