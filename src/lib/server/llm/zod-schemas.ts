import { z } from "zod";

const confidenceSchema = z.enum(["high", "medium", "low"]);
const lineNumberSchema = z.number().int().positive();

const nullableLineNumberSchema = lineNumberSchema.nullable();

const evidenceSchema = z.object({
  path: z.string().min(1),
  lineStart: lineNumberSchema,
  lineEnd: lineNumberSchema,
  reason: z.string().optional(),
});

const analysisEntryPointSchema = z.object({
  name: z.string().min(1),
  kind: z.enum([
    "route",
    "command",
    "cli-command",
    "function",
    "component",
    "api-endpoint",
    "config",
    "other",
  ]),
  path: z.string().min(1),
  lineStart: nullableLineNumberSchema,
  lineEnd: nullableLineNumberSchema,
  description: z.string().min(1),
});

const analysisCoreFileSchema = z.object({
  path: z.string().min(1),
  purpose: z.string().min(1),
  lineStart: nullableLineNumberSchema,
  lineEnd: nullableLineNumberSchema,
});

const analysisBehaviourSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  evidence: z.array(evidenceSchema),
});

const analysisDataFlowStepSchema = z.object({
  step: z.number().int().positive(),
  description: z.string().min(1),
  files: z.array(z.string().min(1)),
});

const analysisPublicInterfaceSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "route",
    "cli-command",
    "public-function",
    "api-endpoint",
    "ui-action",
    "config-option",
    "unknown",
  ]),
  description: z.string().min(1),
  evidence: z.array(evidenceSchema),
});

const analysisSuggestedWikiPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
});

const analysisSubsystemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1).optional(),
  summary: z.string().min(1),
  userValue: z.string().min(1),
  whyThisIsUserFacing: z.string().min(1),
  confidence: confidenceSchema,
  entryPoints: z.array(analysisEntryPointSchema),
  coreFiles: z.array(analysisCoreFileSchema),
  behaviours: z.array(analysisBehaviourSchema),
  dataFlow: z.array(analysisDataFlowStepSchema),
  publicInterfaces: z.array(analysisPublicInterfaceSchema),
  technicalNotes: z.array(z.string()),
  edgeCasesOrLimitations: z.array(z.string()),
  suggestedWikiPages: z.array(analysisSuggestedWikiPageSchema),
});

const analysisCrossCuttingConcernSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  relatedSubsystemIds: z.array(z.string().min(1)),
  evidence: z.array(evidenceSchema),
});

const analysisNavigationItemSchema = z.object({
  title: z.string().min(1),
  subsystemId: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int().nonnegative(),
});

const analysisMissingOrUnclearSchema = z.object({
  topic: z.string().min(1),
  reason: z.string().min(1),
  recommendedFollowUp: z.string().min(1),
});

export const analysisSchema = z.object({
  repo: z.object({
    name: z.string().min(1),
    description: z.string(),
    primaryLanguage: z.string().nullable(),
    frameworks: z.array(z.string()),
    projectType: z.enum([
      "web-app",
      "cli",
      "library",
      "api",
      "desktop-app",
      "mobile-app",
      "unknown",
    ]),
    inferredPurpose: z.string().min(1),
    audience: z.string().optional(),
    confidence: confidenceSchema,
  }),
  subsystems: z.array(analysisSubsystemSchema).min(1).max(10),
  crossCuttingConcerns: z.array(analysisCrossCuttingConcernSchema),
  navigation: z.array(analysisNavigationItemSchema),
  missingOrUnclear: z.array(analysisMissingOrUnclearSchema),
});

const citationSchema = z.object({
  n: z.number().int().positive(),
  path: z.string().min(1),
  startLine: lineNumberSchema,
  endLine: lineNumberSchema,
  excerpt: z.string().optional(),
});

const flowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["input", "core", "branch"]),
});

const flowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const featurePageOutputSchema = z.object({
  overview: z.string().min(1),
  howItWorks: z.string().min(1),
  citations: z.array(citationSchema),
  diagram: z
    .object({
      nodes: z.array(flowNodeSchema).min(2).max(8),
      edges: z.array(flowEdgeSchema).min(1).max(10),
      caption: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type AnalysisSchema = z.infer<typeof analysisSchema>;
export type FeaturePageOutputSchema = z.infer<typeof featurePageOutputSchema>;
