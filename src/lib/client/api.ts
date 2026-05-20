import type { AnalyzeJobPublic } from "@/types/job";
import type { Wiki } from "@/types/wiki";

type ApiPayload<T> = T & {
  error?: string;
};

const readApiPayload = async <Payload>(
  response: Response,
): Promise<ApiPayload<Payload>> =>
  (await response.json()) as ApiPayload<Payload>;

const assertApiOk = <Payload>(
  response: Response,
  payload: ApiPayload<Payload>,
) => {
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }

  return payload;
};

export const startAnalyzeJobRequest = async (
  repoUrl: string,
): Promise<AnalyzeJobPublic> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: repoUrl }),
  });
  const payload = assertApiOk(
    response,
    await readApiPayload<{ job?: AnalyzeJobPublic }>(response),
  );

  if (!payload.job) throw new Error("Analyze API did not return a job.");
  return payload.job;
};

export const getAnalyzeJobRequest = async (
  jobId: string,
): Promise<AnalyzeJobPublic> => {
  const response = await fetch(`/api/jobs/${jobId}`);
  const payload = assertApiOk(
    response,
    await readApiPayload<{ job?: AnalyzeJobPublic }>(response),
  );

  if (!payload.job) throw new Error("Job API did not return a job.");
  return payload.job;
};

export const getWikiRequest = async (wikiId: string): Promise<Wiki> => {
  const response = await fetch(`/api/wiki/${wikiId}`);
  const payload = assertApiOk(
    response,
    await readApiPayload<{ wiki?: Wiki }>(response),
  );

  if (!payload.wiki) throw new Error("Wiki API did not return a wiki.");
  return payload.wiki;
};
