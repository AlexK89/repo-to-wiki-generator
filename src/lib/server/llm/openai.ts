import OpenAI, { APIError, APIConnectionError } from "openai";
import { z } from "zod";

export const OPENAI_MODEL = "gpt-5-mini";

export type GenerateStructuredJsonInput<Schema extends z.ZodType> = {
  schema: Schema;
  schemaName: string;
  prompt: string;
  instructions?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type GenerateStructuredJsonResult<Output> = {
  output: Output;
  responseId: string;
};

export type BackgroundJsonResponseStatus =
  | "completed"
  | "failed"
  | "in_progress"
  | "cancelled"
  | "queued"
  | "incomplete";

export type CreateBackgroundJsonResponseInput = {
  prompt: string;
  instructions?: string;
  maxOutputTokens?: number;
  metadata?: Record<string, string>;
  timeoutMs?: number;
};

export type BackgroundJsonResponse = {
  responseId: string;
  status: BackgroundJsonResponseStatus;
  outputText: string;
  errorMessage?: string;
};

let cachedClient: OpenAI | null = null;

const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return apiKey;
};

export const getOpenAIClient = () => {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: getApiKey(), maxRetries: 0 });
  }

  return cachedClient;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown OpenAI error";

const buildRepairPrompt = (prompt: string, error: unknown) =>
  [
    "The previous response did not satisfy the required JSON schema.",
    "Try again and return only valid JSON matching the schema exactly.",
    `Validation error: ${toErrorMessage(error)}`,
    "",
    "Original task:",
    prompt,
  ].join("\n");

const isRepairableOutputError = (error: unknown) =>
  error instanceof SyntaxError ||
  error instanceof z.ZodError ||
  (error instanceof Error &&
    error.message === "OpenAI returned no JSON output");

export const parseStructuredJson = <Schema extends z.ZodType>(
  schema: Schema,
  outputText: string,
) => {
  if (!outputText) {
    throw new Error("OpenAI returned no JSON output");
  }

  return schema.parse(JSON.parse(outputText));
};

const normalizeBackgroundStatus = (
  status: string | null | undefined,
): BackgroundJsonResponseStatus => {
  if (
    status === "completed" ||
    status === "failed" ||
    status === "in_progress" ||
    status === "cancelled" ||
    status === "queued" ||
    status === "incomplete"
  ) {
    return status;
  }

  return "queued";
};

const getResponseErrorMessage = (response: {
  error?: { message?: string | null } | null;
  incomplete_details?: { reason?: string | null } | null;
}) =>
  response.error?.message ??
  response.incomplete_details?.reason ??
  undefined;

const generateOnce = async <Schema extends z.ZodType>(
  input: GenerateStructuredJsonInput<Schema>,
  prompt: string,
) => {
  const client = getOpenAIClient();
  const response = await client.responses.create(
    {
      model: OPENAI_MODEL,
      input: prompt,
      instructions: input.instructions,
      max_output_tokens: input.maxOutputTokens ?? 8_000,
      reasoning: { effort: "low" },
      store: false,
      text: {
        format: { type: "json_object" },
        verbosity: "medium",
      },
    },
    input.timeoutMs ? { timeout: input.timeoutMs } : undefined,
  );

  return {
    output: parseStructuredJson(input.schema, response.output_text),
    responseId: response.id,
  };
};

export const createBackgroundJsonResponse = async ({
  prompt,
  instructions,
  maxOutputTokens = 8_000,
  metadata,
  timeoutMs = 15_000,
}: CreateBackgroundJsonResponseInput): Promise<BackgroundJsonResponse> => {
  const client = getOpenAIClient();
  const response = await client.responses.create(
    {
      model: OPENAI_MODEL,
      input: prompt,
      instructions,
      max_output_tokens: maxOutputTokens,
      metadata,
      background: true,
      reasoning: { effort: "low" },
      store: true,
      text: {
        format: { type: "json_object" },
        verbosity: "low",
      },
    },
    { timeout: timeoutMs },
  );

  return {
    responseId: response.id,
    status: normalizeBackgroundStatus(response.status),
    outputText: response.output_text,
    errorMessage: getResponseErrorMessage(response),
  };
};

export const retrieveBackgroundJsonResponse = async (
  responseId: string,
  timeoutMs = 15_000,
): Promise<BackgroundJsonResponse> => {
  const client = getOpenAIClient();
  const response = await client.responses.retrieve(
    responseId,
    { stream: false },
    { timeout: timeoutMs },
  );

  return {
    responseId: response.id,
    status: normalizeBackgroundStatus(response.status),
    outputText: response.output_text,
    errorMessage: getResponseErrorMessage(response),
  };
};

export const generateStructuredJson = async <Schema extends z.ZodType>(
  input: GenerateStructuredJsonInput<Schema>,
): Promise<GenerateStructuredJsonResult<z.infer<Schema>>> => {
  try {
    return await generateOnce(input, input.prompt);
  } catch (error) {
    if (
      error instanceof APIError ||
      error instanceof APIConnectionError ||
      !isRepairableOutputError(error)
    ) {
      throw error;
    }

    return generateOnce(input, buildRepairPrompt(input.prompt, error));
  }
};
