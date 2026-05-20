import type { ApiHandler } from "../../src/lib/server/http";
import {
  getErrorMessage,
  getRequestUrl,
  sendJson,
  sendMethodNotAllowed,
} from "../../src/lib/server/http";
import {
  advanceAnalyzeJob,
  toPublicAnalyzeJob,
} from "../../src/lib/server/jobs/analyze-job";

const getJobId = (requestPathname: string) =>
  requestPathname.split("/").filter(Boolean).at(-1) ?? "";

const handler: ApiHandler = async (request, response) => {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET"]);
    return;
  }

  const requestUrl = getRequestUrl(request);
  const jobId = getJobId(requestUrl.pathname);

  try {
    const job = await advanceAnalyzeJob(jobId);

    if (!job) {
      sendJson(response, 404, { error: "Job not found", jobId });
      return;
    }

    sendJson(response, 200, { job: toPublicAnalyzeJob(job) });
  } catch (error) {
    sendJson(response, 500, {
      error: getErrorMessage(error),
      jobId,
    });
  }
};

export default handler;
