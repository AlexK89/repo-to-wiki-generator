import type { Citation, FeatureDiagram } from "./wiki";

export type Confidence = "high" | "medium" | "low";

export type AnalysisProjectType =
  | "web-app"
  | "cli"
  | "library"
  | "api"
  | "desktop-app"
  | "mobile-app"
  | "unknown";

export type AnalysisEntryPointKind =
  | "route"
  | "command"
  | "cli-command"
  | "function"
  | "component"
  | "api-endpoint"
  | "config"
  | "other";

export type AnalysisPublicInterfaceType =
  | "route"
  | "cli-command"
  | "public-function"
  | "api-endpoint"
  | "ui-action"
  | "config-option"
  | "unknown";

export type AnalysisEvidence = {
  path: string;
  lineStart: number;
  lineEnd: number;
  reason?: string | null;
};

export type AnalysisRepo = {
  name: string;
  description: string;
  primaryLanguage: string | null;
  frameworks: string[];
  projectType: AnalysisProjectType;
  inferredPurpose: string;
  audience?: string | null;
  confidence: Confidence;
};

export type AnalysisEntryPoint = {
  name: string;
  kind: AnalysisEntryPointKind;
  path: string;
  lineStart: number | null;
  lineEnd: number | null;
  description: string;
};

export type AnalysisCoreFile = {
  path: string;
  purpose: string;
  lineStart: number | null;
  lineEnd: number | null;
};

export type AnalysisBehaviour = {
  name: string;
  description: string;
  evidence: AnalysisEvidence[];
};

export type AnalysisDataFlowStep = {
  step: number;
  description: string;
  files: string[];
};

export type AnalysisPublicInterface = {
  name: string;
  type: AnalysisPublicInterfaceType;
  description: string;
  evidence: AnalysisEvidence[];
};

export type AnalysisSuggestedWikiPage = {
  slug: string;
  title: string;
  purpose: string;
};

export type AnalysisSubsystem = {
  id: string;
  title: string;
  category?: string | null;
  summary: string;
  userValue: string;
  whyThisIsUserFacing: string;
  confidence: Confidence;
  entryPoints: AnalysisEntryPoint[];
  coreFiles: AnalysisCoreFile[];
  behaviours: AnalysisBehaviour[];
  dataFlow: AnalysisDataFlowStep[];
  publicInterfaces: AnalysisPublicInterface[];
  technicalNotes: string[];
  edgeCasesOrLimitations: string[];
  suggestedWikiPages: AnalysisSuggestedWikiPage[];
};

export type AnalysisCrossCuttingConcern = {
  title: string;
  description: string;
  relatedSubsystemIds: string[];
  evidence: AnalysisEvidence[];
};

export type AnalysisNavigationItem = {
  title: string;
  subsystemId: string;
  slug: string;
  order: number;
};

export type AnalysisMissingOrUnclear = {
  topic: string;
  reason: string;
  recommendedFollowUp: string;
};

export type Analysis = {
  repo: AnalysisRepo;
  subsystems: AnalysisSubsystem[];
  crossCuttingConcerns: AnalysisCrossCuttingConcern[];
  navigation: AnalysisNavigationItem[];
  missingOrUnclear: AnalysisMissingOrUnclear[];
};

export type RenderedFeaturePage = {
  overview: string;
  howItWorks: string;
  citations: Citation[];
  diagram?: FeatureDiagram | null;
};

export type RenderedSubsystemPage = {
  subsystemId: string;
  page: RenderedFeaturePage;
};
