import type {
  Analysis,
  AnalysisEvidence,
  AnalysisSubsystem,
  RenderedFeaturePage,
  RenderedSubsystemPage,
} from "@/types/analysis";
import { featurePagePrompt } from "@/prompts/feature-page";
import type { DigestFileExcerpt, RepositoryDigest } from "../github/digest";
import {
  normalizeCitationMarkers,
  renumberCitations,
  sourceFilesFromDigestExcerpts,
  validateCitations,
} from "./citation-validator";
import { generateStructuredJson } from "./openai";
import { renderJsonPromptValue, renderPrompt } from "./render-prompt";
import { featurePageOutputSchema } from "./zod-schemas";

export type RenderSubsystemPagesInput = {
  analysis: Analysis;
  digest: RepositoryDigest;
};

const MAX_EVIDENCE_FILES = 10;

const getEvidencePaths = (subsystem: AnalysisSubsystem) => {
  const paths = new Set<string>();
  const addEvidence = (evidence: AnalysisEvidence) => paths.add(evidence.path);

  for (const entryPoint of subsystem.entryPoints) paths.add(entryPoint.path);
  for (const coreFile of subsystem.coreFiles) paths.add(coreFile.path);
  for (const behaviour of subsystem.behaviours) {
    behaviour.evidence.forEach(addEvidence);
  }
  for (const publicInterface of subsystem.publicInterfaces) {
    publicInterface.evidence.forEach(addEvidence);
  }
  for (const dataFlowStep of subsystem.dataFlow) {
    dataFlowStep.files.forEach((path) => paths.add(path));
  }

  return paths;
};

const formatEvidenceFile = (file: DigestFileExcerpt) =>
  [
    `--- ${file.path} (lines ${file.lineStart}-${file.lineEnd})`,
    file.content,
  ].join("\n");

const selectEvidenceFiles = (
  subsystem: AnalysisSubsystem,
  digest: RepositoryDigest,
) => {
  const evidencePaths = getEvidencePaths(subsystem);
  const matchedFiles = digest.selectedFiles.filter((file) =>
    evidencePaths.has(file.path),
  );
  const files = matchedFiles.length > 0 ? matchedFiles : digest.selectedFiles;

  return files.slice(0, MAX_EVIDENCE_FILES);
};

const normalizeFeaturePage = (
  page: RenderedFeaturePage,
  evidenceFiles: DigestFileExcerpt[],
): RenderedFeaturePage => {
  const validatedCitations = validateCitations(
    page.citations,
    sourceFilesFromDigestExcerpts(evidenceFiles),
  );
  const { citations, citationNumberMap } = renumberCitations(
    validatedCitations,
    [page.overview, page.howItWorks],
  );

  return {
    ...page,
    overview: normalizeCitationMarkers(page.overview, citationNumberMap),
    howItWorks: normalizeCitationMarkers(page.howItWorks, citationNumberMap),
    citations,
  };
};

const renderSubsystemPrompt = (
  subsystem: AnalysisSubsystem,
  evidenceFiles: DigestFileExcerpt[],
) =>
  renderPrompt(featurePagePrompt, {
    SUBSYSTEM: renderJsonPromptValue(subsystem),
    EVIDENCE_FILES: evidenceFiles.map(formatEvidenceFile).join("\n\n"),
  });

export const renderSubsystemPage = async (
  subsystem: AnalysisSubsystem,
  digest: RepositoryDigest,
): Promise<RenderedSubsystemPage> => {
  const evidenceFiles = selectEvidenceFiles(subsystem, digest);
  const prompt = renderSubsystemPrompt(subsystem, evidenceFiles);
  const result = await generateStructuredJson({
    schema: featurePageOutputSchema,
    schemaName: "feature_page",
    prompt,
    instructions:
      "Return only the feature page JSON. Every concrete implementation claim needs a validated source citation.",
    maxOutputTokens: 7_000,
    timeoutMs: 30_000,
  });

  return {
    subsystemId: subsystem.id,
    page: normalizeFeaturePage(result.output, evidenceFiles),
  };
};

export const renderSubsystemPages = async ({
  analysis,
  digest,
}: RenderSubsystemPagesInput) =>
  Promise.all(
    analysis.subsystems.map((subsystem) =>
      renderSubsystemPage(subsystem, digest),
    ),
  );
