import type {
  Analysis,
  AnalysisDiscovery,
  AnalysisDiscoverySubsystem,
  AnalysisSubsystem,
  SubsystemDeepDive,
} from "@/types/analysis";
import { repoAnalyserDeepDivePrompt } from "@/prompts/repo-analyser-deepdive";
import type { DigestFileExcerpt, RepositoryDigest } from "../github/digest";
import { parseStructuredJson } from "./openai";
import { renderJsonPromptValue, renderPrompt } from "./render-prompt";
import { subsystemDeepDiveSchema } from "./zod-schemas";

export type DeepDivePrompt = {
  subsystemId: string;
  prompt: string;
  evidenceFiles: DigestFileExcerpt[];
};

const MAX_EVIDENCE_FILES = 10;

const getDiscoveryEvidencePaths = (subsystem: AnalysisDiscoverySubsystem) => {
  const paths = new Set<string>();
  for (const entryPoint of subsystem.entryPoints) paths.add(entryPoint.path);
  for (const coreFile of subsystem.coreFiles) paths.add(coreFile.path);
  return paths;
};

const formatEvidenceFile = (file: DigestFileExcerpt) =>
  [
    `--- ${file.path} (lines ${file.lineStart}-${file.lineEnd})`,
    file.content,
  ].join("\n");

const selectEvidenceFiles = (
  subsystem: AnalysisDiscoverySubsystem,
  digest: RepositoryDigest,
) => {
  const evidencePaths = getDiscoveryEvidencePaths(subsystem);
  const matched = digest.selectedFiles.filter((file) =>
    evidencePaths.has(file.path),
  );
  const files = matched.length > 0 ? matched : digest.selectedFiles;
  return files.slice(0, MAX_EVIDENCE_FILES);
};

export const createDeepDivePrompt = (
  subsystem: AnalysisDiscoverySubsystem,
  digest: RepositoryDigest,
): DeepDivePrompt => {
  const evidenceFiles = selectEvidenceFiles(subsystem, digest);
  const prompt = renderPrompt(repoAnalyserDeepDivePrompt, {
    SUBSYSTEM: renderJsonPromptValue(subsystem),
    EVIDENCE_FILES: evidenceFiles.map(formatEvidenceFile).join("\n\n"),
  });

  return {
    subsystemId: subsystem.id,
    prompt,
    evidenceFiles,
  };
};

export const parseDeepDiveOutput = (
  expectedSubsystemId: string,
  outputText: string,
): SubsystemDeepDive => {
  const parsed = parseStructuredJson(subsystemDeepDiveSchema, outputText);

  return {
    subsystemId: expectedSubsystemId,
    behaviours: parsed.behaviours.map((behaviour) => ({
      name: behaviour.name,
      description: behaviour.description,
      evidence: behaviour.evidence.map((entry) => ({
        path: entry.path,
        lineStart: entry.lineStart,
        lineEnd: entry.lineEnd,
        reason: entry.reason ?? undefined,
      })),
    })),
    dataFlow: parsed.dataFlow.map((step) => ({
      step: step.step,
      description: step.description,
      files: step.files,
    })),
    publicInterfaces: parsed.publicInterfaces.map((publicInterface) => ({
      name: publicInterface.name,
      type: publicInterface.type,
      description: publicInterface.description,
      evidence: publicInterface.evidence.map((entry) => ({
        path: entry.path,
        lineStart: entry.lineStart,
        lineEnd: entry.lineEnd,
        reason: entry.reason ?? undefined,
      })),
    })),
  };
};

export const mergeDiscoveryWithDeepDives = (
  discovery: AnalysisDiscovery,
  deepDives: SubsystemDeepDive[],
): Analysis => {
  const deepDiveLookup = new Map(
    deepDives.map((deepDive) => [deepDive.subsystemId, deepDive]),
  );

  const subsystems: AnalysisSubsystem[] = discovery.subsystems.map(
    (discoverySubsystem) => {
      const deepDive = deepDiveLookup.get(discoverySubsystem.id);
      return {
        ...discoverySubsystem,
        behaviours: deepDive?.behaviours ?? [],
        dataFlow: deepDive?.dataFlow ?? [],
        publicInterfaces: deepDive?.publicInterfaces ?? [],
      };
    },
  );

  return {
    repo: discovery.repo,
    subsystems,
    crossCuttingConcerns: discovery.crossCuttingConcerns,
  };
};
