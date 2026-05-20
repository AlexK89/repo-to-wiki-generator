import type { Analysis } from "@/types/analysis";
import type { RepositoryDigest } from "../github/digest";
import { generateStructuredJson } from "./openai";
import { analysisSchema } from "./zod-schemas";

export type AnalysisGenericGuardResult = {
  offendingSubsystems: string[];
  hasGenericSubsystems: boolean;
};

export type RunRepositoryAnalysisInput = {
  digest: RepositoryDigest;
};

const GENERIC_SUBSYSTEM_PATTERNS = [
  /\bfrontend\b/i,
  /\bbackend\b/i,
  /\bcomponents?\b/i,
  /\butils?\b/i,
  /\bhelpers?\b/i,
  /\bapi layer\b/i,
  /\bdatabase layer\b/i,
  /\bservices?\b/i,
  /\bmodels?\b/i,
];

const isGenericSubsystemName = (value: string) =>
  GENERIC_SUBSYSTEM_PATTERNS.some((pattern) => pattern.test(value));

export const buildGenericRepairPrompt = (
  prompt: string,
  guardResult: AnalysisGenericGuardResult,
) =>
  [
    "Your previous subsystem names were too implementation-layer-oriented.",
    `Rejected subsystem names: ${guardResult.offendingSubsystems.join(", ")}`,
    "Rewrite the analysis around user-facing behaviours and features.",
    "Do not use names such as Frontend, Backend, Components, Utils, API layer, Database layer, Services, or Models.",
    "",
    prompt,
  ].join("\n");

export const detectGenericSubsystems = (
  analysis: Analysis,
): AnalysisGenericGuardResult => {
  const offendingSubsystems = analysis.subsystems
    .filter(
      (subsystem) =>
        isGenericSubsystemName(subsystem.title) ||
        isGenericSubsystemName(subsystem.id),
    )
    .map((subsystem) => subsystem.title);

  return {
    offendingSubsystems,
    hasGenericSubsystems: offendingSubsystems.length > 0,
  };
};

const requestAnalysis = async (prompt: string) => {
  const result = await generateStructuredJson({
    schema: analysisSchema,
    schemaName: "repository_analysis",
    prompt,
    instructions:
      "Return only the repository analysis JSON. Prefer feature and workflow names over technical layer names.",
    maxOutputTokens: 5_000,
    timeoutMs: 90_000,
  });

  return result.output as Analysis;
};

export const runRepositoryAnalysis = async ({
  digest,
}: RunRepositoryAnalysisInput) => {
  const analysis = await requestAnalysis(digest.prompt);
  const guardResult = detectGenericSubsystems(analysis);

  if (!guardResult.hasGenericSubsystems) {
    return analysis;
  }

  return requestAnalysis(buildGenericRepairPrompt(digest.prompt, guardResult));
};
