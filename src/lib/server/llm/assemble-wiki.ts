import type {
  Analysis,
  AnalysisEntryPoint,
  AnalysisPublicInterface,
  AnalysisSubsystem,
  RenderedFeaturePage,
  RenderedSubsystemPage,
} from "@/types/analysis";
import type {
  CategorySlot,
  Citation,
  EntryPoint,
  EntryPointKind,
  Feature,
  FeatureDiagram,
  FlowNodeKind,
  Wiki,
  WikiCategory,
} from "@/types/wiki";
import type { RepositoryDigest } from "../github/digest";
import { OPENAI_MODEL } from "./openai";

export type AssembleWikiInput = {
  analysis: Analysis;
  digest: RepositoryDigest;
  pages: RenderedSubsystemPage[];
  startedAt?: number;
  generatedAt?: string;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeCategoryLabel = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const getCategoryKey = (value: string) =>
  normalizeCategoryLabel(value).toLowerCase();

const CATEGORY_SLOT_ORDER: CategorySlot[] = [
  "core",
  "workflow",
  "integration",
  "ui",
  "ops",
  "ext",
];

const getCategorySlot = (index: number): CategorySlot =>
  CATEGORY_SLOT_ORDER[index % CATEGORY_SLOT_ORDER.length];

const inferCategoryLabel = (subsystem: AnalysisSubsystem) => {
  const searchableText = [
    subsystem.id,
    subsystem.title,
    subsystem.summary,
    subsystem.userValue,
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(ui|screen|view|component|theme|style|render|display)\b/.test(searchableText)) {
    return "Interface and presentation";
  }

  if (/\b(github|webhook|url|http|import|export|api|third-party|integration)\b/.test(searchableText)) {
    return "External content and integrations";
  }

  if (/\b(deploy|config|cache|job|queue|error|logging|monitor|security)\b/.test(searchableText)) {
    return "Operations and reliability";
  }

  if (/\b(plugin|extension|addon|adapter)\b/.test(searchableText)) {
    return "Extension points";
  }

  if (/\b(workflow|flow|create|edit|filter|search|ask|generate)\b/.test(searchableText)) {
    return "User workflows";
  }

  return "Core product behaviour";
};

const getSubsystemCategoryLabel = (subsystem: AnalysisSubsystem) =>
  normalizeCategoryLabel(subsystem.category || inferCategoryLabel(subsystem));

const createCategoryId = (
  label: string,
  usedCategoryIds: Set<string>,
  index: number,
) => {
  const baseId = slugify(label) || `category-${index + 1}`;
  let categoryId = baseId;
  let suffix = 2;

  while (usedCategoryIds.has(categoryId)) {
    categoryId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedCategoryIds.add(categoryId);
  return categoryId;
};

const createWikiCategories = (analysis: Analysis) => {
  const usedCategoryIds = new Set<string>();
  const categoryKeyMap = new Map<string, WikiCategory>();

  for (const subsystem of analysis.subsystems) {
    const label = getSubsystemCategoryLabel(subsystem);
    const categoryKey = getCategoryKey(label);

    if (categoryKeyMap.has(categoryKey)) continue;

    const categoryIndex = categoryKeyMap.size;
    categoryKeyMap.set(categoryKey, {
      id: createCategoryId(label, usedCategoryIds, categoryIndex),
      label,
      slot: getCategorySlot(categoryIndex),
    });
  }

  return [...categoryKeyMap.values()];
};

const getCategoryIdForSubsystem = (
  categories: WikiCategory[],
  subsystem: AnalysisSubsystem,
) => {
  const categoryKey = getCategoryKey(getSubsystemCategoryLabel(subsystem));
  const category = categories.find(
    (candidate) => getCategoryKey(candidate.label) === categoryKey,
  );

  return category?.id ?? categories[0]?.id ?? "core-product-behaviour";
};

const getSubsystemSlug = (
  analysis: Analysis,
  subsystem: AnalysisSubsystem,
) => {
  const navigationItem = analysis.navigation.find(
    (item) => item.subsystemId === subsystem.id,
  );

  return slugify(navigationItem?.slug ?? subsystem.id ?? subsystem.title);
};

const getStack = (analysis: Analysis) =>
  [
    analysis.repo.primaryLanguage,
    ...analysis.repo.frameworks,
  ].filter((item): item is string => Boolean(item));

const getAudience = (analysis: Analysis) => {
  if (analysis.repo.audience) return analysis.repo.audience;

  const userValues = analysis.subsystems
    .slice(0, 3)
    .map((subsystem) => subsystem.userValue.toLowerCase());

  return userValues.length > 0
    ? `Developers who need ${userValues.join(", ")}.`
    : "Developers exploring how this repository works.";
};

const normalizeEntryPointKind = (
  kind: AnalysisEntryPoint["kind"],
): EntryPointKind => {
  if (kind === "cli-command" || kind === "command") return "command";
  if (kind === "api-endpoint") return "route";
  if (kind === "route" || kind === "function" || kind === "component" || kind === "config") {
    return kind;
  }

  return "function";
};

const normalizePublicInterfaceKind = (
  type: AnalysisPublicInterface["type"],
): EntryPointKind => {
  if (type === "cli-command") return "command";
  if (type === "api-endpoint" || type === "route") return "route";
  if (type === "ui-action") return "component";
  if (type === "config-option") return "config";
  return "function";
};

const rangesOverlap = (
  citation: Citation,
  lineStart: number | null,
  lineEnd: number | null,
) => {
  if (!lineStart || !lineEnd || !citation.startLine || !citation.endLine) {
    return false;
  }

  return citation.startLine <= lineEnd && citation.endLine >= lineStart;
};

const findCitationNumber = (
  citations: Citation[],
  path: string,
  lineStart: number | null,
  lineEnd: number | null,
) => {
  const overlappingCitation = citations.find(
    (citation) =>
      citation.path === path && rangesOverlap(citation, lineStart, lineEnd),
  );

  if (overlappingCitation) return overlappingCitation.n;

  const pathCitation = citations.find((citation) => citation.path === path);
  return pathCitation?.n ?? citations[0]?.n;
};

const entryPointFromAnalysisEntryPoint = (
  analysisEntryPoint: AnalysisEntryPoint,
  citations: Citation[],
): EntryPoint | null => {
  const citationNumber = findCitationNumber(
    citations,
    analysisEntryPoint.path,
    analysisEntryPoint.lineStart,
    analysisEntryPoint.lineEnd,
  );

  if (!citationNumber) return null;

  return {
    kind: normalizeEntryPointKind(analysisEntryPoint.kind),
    name: analysisEntryPoint.name,
    signature: analysisEntryPoint.description,
    citation: citationNumber,
  };
};

const entryPointFromPublicInterface = (
  publicInterface: AnalysisPublicInterface,
  citations: Citation[],
): EntryPoint | null => {
  const firstEvidence = publicInterface.evidence[0];
  const citationNumber = firstEvidence
    ? findCitationNumber(
        citations,
        firstEvidence.path,
        firstEvidence.lineStart,
        firstEvidence.lineEnd,
      )
    : citations[0]?.n;

  if (!citationNumber) return null;

  return {
    kind: normalizePublicInterfaceKind(publicInterface.type),
    name: publicInterface.name,
    signature: publicInterface.description,
    citation: citationNumber,
  };
};

const dedupeEntryPoints = (entryPoints: EntryPoint[]) => {
  const seenKeys = new Set<string>();

  return entryPoints.filter((entryPoint) => {
    const key = `${entryPoint.kind}:${entryPoint.name}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
};

const getEntryPoints = (
  subsystem: AnalysisSubsystem,
  page: RenderedFeaturePage,
) => {
  const analysisEntryPoints = subsystem.entryPoints.flatMap((entryPoint) => {
    const mappedEntryPoint = entryPointFromAnalysisEntryPoint(
      entryPoint,
      page.citations,
    );
    return mappedEntryPoint ? [mappedEntryPoint] : [];
  });
  const publicEntryPoints = subsystem.publicInterfaces.flatMap(
    (publicInterface) => {
      const mappedEntryPoint = entryPointFromPublicInterface(
        publicInterface,
        page.citations,
      );
      return mappedEntryPoint ? [mappedEntryPoint] : [];
    },
  );

  return dedupeEntryPoints([...analysisEntryPoints, ...publicEntryPoints]);
};

const getRelatedFeatureSlugs = (
  analysis: Analysis,
  subsystem: AnalysisSubsystem,
  subsystemSlugMap: Map<string, string>,
) => {
  const relatedSubsystemIds = new Set<string>();

  for (const concern of analysis.crossCuttingConcerns) {
    if (!concern.relatedSubsystemIds.includes(subsystem.id)) continue;
    for (const relatedSubsystemId of concern.relatedSubsystemIds) {
      if (relatedSubsystemId !== subsystem.id) {
        relatedSubsystemIds.add(relatedSubsystemId);
      }
    }
  }

  return [...relatedSubsystemIds].flatMap((relatedSubsystemId) => {
    const slug = subsystemSlugMap.get(relatedSubsystemId);
    return slug ? [slug] : [];
  });
};

const getFlowNodeKind = (index: number, total: number): FlowNodeKind => {
  if (index === 0) return "input";
  if (index === total - 1) return "branch";
  return "core";
};

const deriveDiagramFromDataFlow = (
  subsystem: AnalysisSubsystem,
): FeatureDiagram | null => {
  if (subsystem.dataFlow.length < 2) return null;

  const orderedSteps = [...subsystem.dataFlow].sort(
    (leftStep, rightStep) => leftStep.step - rightStep.step,
  );
  const nodes = orderedSteps.map((step, index) => ({
    id: `step-${step.step}`,
    label: step.description.split(/[.;]/)[0].slice(0, 46),
    kind: getFlowNodeKind(index, orderedSteps.length),
  }));
  const edges = orderedSteps.slice(1).map((step, index) => ({
    from: `step-${orderedSteps[index].step}`,
    to: `step-${step.step}`,
  }));

  return {
    nodes,
    edges,
    caption: `${subsystem.title} flow derived from the repository analysis.`,
  };
};

const getFeaturePage = (
  subsystem: AnalysisSubsystem,
  page: RenderedFeaturePage,
): RenderedFeaturePage => ({
  ...page,
  diagram: page.diagram ?? deriveDiagramFromDataFlow(subsystem),
});

const createFeature = (
  analysis: Analysis,
  subsystem: AnalysisSubsystem,
  page: RenderedFeaturePage,
  subsystemSlugMap: Map<string, string>,
  categories: WikiCategory[],
): Feature => {
  const featurePage = getFeaturePage(subsystem, page);

  return {
    slug: subsystemSlugMap.get(subsystem.id) ?? slugify(subsystem.id),
    title: subsystem.title,
    oneLiner: subsystem.userValue || subsystem.summary,
    category: getCategoryIdForSubsystem(categories, subsystem),
    page: {
      overview: featurePage.overview,
      howItWorks: featurePage.howItWorks,
      entryPoints: getEntryPoints(subsystem, featurePage),
      citations: featurePage.citations,
      related: getRelatedFeatureSlugs(analysis, subsystem, subsystemSlugMap),
      diagram: featurePage.diagram,
    },
  };
};

const getPageLookup = (pages: RenderedSubsystemPage[]) =>
  new Map(pages.map((page) => [page.subsystemId, page.page]));

const createFallbackPage = (subsystem: AnalysisSubsystem): RenderedFeaturePage => ({
  overview: subsystem.summary,
  howItWorks: [
    subsystem.behaviours.map((behaviour) => behaviour.description).join("\n\n"),
    subsystem.technicalNotes.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n"),
  citations: [],
  diagram: deriveDiagramFromDataFlow(subsystem),
});

export const assembleWiki = ({
  analysis,
  digest,
  pages,
  startedAt,
  generatedAt = new Date().toISOString(),
}: AssembleWikiInput): Wiki => {
  const pageLookup = getPageLookup(pages);
  const categories = createWikiCategories(analysis);
  const subsystemSlugMap = new Map(
    analysis.subsystems.map((subsystem) => [
      subsystem.id,
      getSubsystemSlug(analysis, subsystem),
    ]),
  );
  const features = analysis.subsystems.map((subsystem) =>
    createFeature(
      analysis,
      subsystem,
      pageLookup.get(subsystem.id) ?? createFallbackPage(subsystem),
      subsystemSlugMap,
      categories,
    ),
  );
  const generationMs = startedAt ? Date.now() - startedAt : 0;

  return {
    repo: {
      owner: digest.repository.owner,
      name: digest.repository.name,
      sha: digest.repository.sha,
      defaultBranch: digest.repository.defaultBranch,
      description: digest.repository.description,
      stars: digest.repository.stars,
      language: digest.repository.primaryLanguage ?? undefined,
      license: digest.repository.license ?? undefined,
    },
    summary: analysis.repo.inferredPurpose,
    audience: getAudience(analysis),
    stack: getStack(analysis),
    categories,
    features,
    generatedAt,
    modelVersion: OPENAI_MODEL,
    stats: {
      files: digest.stats.filesSelected,
      linesAnalyzed: digest.selectedFiles.reduce(
        (lineCount, file) => lineCount + file.lineEnd,
        0,
      ),
      featuresIdentified: features.length,
      citations: features.reduce(
        (citationCount, feature) =>
          citationCount + feature.page.citations.length,
        0,
      ),
      generationMs,
    },
  };
};
