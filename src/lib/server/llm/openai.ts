import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

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
    cachedClient = new OpenAI({ apiKey: getApiKey() });
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

const parseResponse = <Schema extends z.ZodType>(
  schema: Schema,
  parsedOutput: z.infer<Schema> | null,
) => {
  if (!parsedOutput) {
    throw new Error("OpenAI returned no parsed JSON output");
  }

  return schema.parse(parsedOutput);
};

const generateOnce = async <Schema extends z.ZodType>(
  input: GenerateStructuredJsonInput<Schema>,
  prompt: string,
) => {
  const client = getOpenAIClient();
  const response = await client.responses.parse(
    {
      model: OPENAI_MODEL,
      input: prompt,
      instructions: input.instructions,
      max_output_tokens: input.maxOutputTokens ?? 8_000,
      reasoning: { effort: "low" },
      store: false,
      text: {
        format: zodTextFormat(input.schema, input.schemaName),
        verbosity: "medium",
      },
    },
    input.timeoutMs ? { timeout: input.timeoutMs } : undefined,
  );

  return {
    output: parseResponse(input.schema, response.output_parsed),
    responseId: response.id,
  };
};

export const generateStructuredJson = async <Schema extends z.ZodType>(
  input: GenerateStructuredJsonInput<Schema>,
): Promise<GenerateStructuredJsonResult<z.infer<Schema>>> => {
  try {
    return await generateOnce(input, input.prompt);
  } catch (error) {
    return generateOnce(input, buildRepairPrompt(input.prompt, error));
  }
};
