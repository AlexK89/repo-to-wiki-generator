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
import { generateStructuredJson, parseStructuredJson } from "./openai";
import { renderJsonPromptValue, renderPrompt } from "./render-prompt";
import { featurePageOutputSchema } from "./zod-schemas";
import type { FeaturePageOutputSchema } from "./zod-schemas";

export type RenderSubsystemPagesInput = {
  analysis: Analysis;
  digest: RepositoryDigest;
};

export type SubsystemPagePrompt = {
  subsystemId: string;
  prompt: string;
  evidenceFiles: DigestFileExcerpt[];
};

export type ParseSubsystemPageOutputInput = {
  subsystem: AnalysisSubsystem;
  outputText: string;
  evidenceFiles: DigestFileExcerpt[];
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

const normalizeOutputPage = (
  page: FeaturePageOutputSchema,
): RenderedFeaturePage => ({
  overview: page.overview,
  howItWorks: page.howItWorks,
  citations: page.citations.map((citation) => ({
    n: citation.n,
    path: citation.path,
    startLine: citation.startLine,
    endLine: citation.endLine,
    excerpt: citation.excerpt ?? undefined,
  })),
  diagram: page.diagram
    ? {
        nodes: page.diagram.nodes,
        edges: page.diagram.edges.map((edge) => ({
          from: edge.from,
          to: edge.to,
          label: edge.label ?? undefined,
        })),
        caption: page.diagram.caption ?? undefined,
      }
    : null,
});

const renderSubsystemPrompt = (
  subsystem: AnalysisSubsystem,
  evidenceFiles: DigestFileExcerpt[],
) =>
  renderPrompt(featurePagePrompt, {
    SUBSYSTEM: renderJsonPromptValue(subsystem),
    EVIDENCE_FILES: evidenceFiles.map(formatEvidenceFile).join("\n\n"),
  });

export const createSubsystemPagePrompt = (
  subsystem: AnalysisSubsystem,
  digest: RepositoryDigest,
): SubsystemPagePrompt => {
  const evidenceFiles = selectEvidenceFiles(subsystem, digest);

  return {
    subsystemId: subsystem.id,
    prompt: renderSubsystemPrompt(subsystem, evidenceFiles),
    evidenceFiles,
  };
};

export const parseSubsystemPageOutput = ({
  subsystem,
  outputText,
  evidenceFiles,
}: ParseSubsystemPageOutputInput): RenderedSubsystemPage => {
  const output = parseStructuredJson(featurePageOutputSchema, outputText);

  return {
    subsystemId: subsystem.id,
    page: normalizeFeaturePage(normalizeOutputPage(output), evidenceFiles),
  };
};

export const renderSubsystemPage = async (
  subsystem: AnalysisSubsystem,
  digest: RepositoryDigest,
): Promise<RenderedSubsystemPage> => {
  const pagePrompt = createSubsystemPagePrompt(subsystem, digest);
  const result = await generateStructuredJson({
    schema: featurePageOutputSchema,
    schemaName: "feature_page",
    prompt: pagePrompt.prompt,
    instructions:
      "Return only the feature page JSON. Every concrete implementation claim needs a validated source citation.",
    maxOutputTokens: 2_000,
    timeoutMs: 35_000,
  });

  return {
    subsystemId: subsystem.id,
    page: normalizeFeaturePage(
      normalizeOutputPage(result.output),
      pagePrompt.evidenceFiles,
    ),
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
