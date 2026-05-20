export type CategorySlot =
  | "core"
  | "workflow"
  | "integration"
  | "ops"
  | "ui"
  | "ext";

export type WikiCategory = {
  id: string;
  label: string;
  description?: string;
  slot: CategorySlot;
};

export type EntryPointKind =
  | "function"
  | "command"
  | "route"
  | "component"
  | "config";

export type Citation = {
  n: number;
  path: string;
  startLine?: number;
  endLine?: number;
  excerpt?: string;
};

export type EntryPoint = {
  kind: EntryPointKind;
  name: string;
  signature?: string;
  citation: number;
};

export type FlowNodeKind = "input" | "core" | "branch";

export type FlowNode = {
  id: string;
  label: string;
  kind: FlowNodeKind;
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
};

export type FeatureDiagram = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  caption?: string;
};

export type FeaturePage = {
  overview: string;
  howItWorks: string;
  entryPoints: EntryPoint[];
  citations: Citation[];
  related: string[];
  diagram?: FeatureDiagram | null;
};

export type Feature = {
  slug: string;
  title: string;
  oneLiner: string;
  category: string;
  page: FeaturePage;
};

export type WikiRepo = {
  owner: string;
  name: string;
  sha: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  language?: string;
  license?: string;
};

export type WikiStats = {
  files: number;
  linesAnalyzed: number;
  featuresIdentified: number;
  citations: number;
  generationMs: number;
};

export type Wiki = {
  repo: WikiRepo;
  summary: string;
  audience: string;
  stack: string[];
  categories: WikiCategory[];
  features: Feature[];
  generatedAt: string;
  modelVersion: "gpt-5-mini";
  stats: WikiStats;
};

export type LogLineType = "step" | "info" | "ai" | "feature" | "page" | "done";

export type LogLine = {
  type: LogLineType;
  text: string;
  detail?: string;
  category?: CategorySlot;
};
