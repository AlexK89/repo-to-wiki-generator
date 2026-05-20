import { z } from "zod";

const lineNumberSchema = z.number().int().positive();
const nullableLineNumberSchema = lineNumberSchema.nullable();

const evidenceSchema = z.object({
  path: z.string().min(1),
  lineStart: lineNumberSchema,
  lineEnd: lineNumberSchema,
  reason: z.string().nullable().optional(),
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

const repoSchema = z.object({
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
  audience: z.string().nullable().optional(),
});

const discoverySubsystemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1).nullable().optional(),
  summary: z.string().min(1),
  userValue: z.string().min(1),
  whyThisIsUserFacing: z.string().min(1),
  entryPoints: z.array(analysisEntryPointSchema),
  coreFiles: z.array(analysisCoreFileSchema),
});

const discoveryCrossCuttingConcernSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  relatedSubsystemIds: z.array(z.string().min(1)),
});

export const analysisDiscoverySchema = z.object({
  repo: repoSchema,
  subsystems: z.array(discoverySubsystemSchema).min(1).max(6),
  crossCuttingConcerns: z.array(discoveryCrossCuttingConcernSchema),
});

export const subsystemDeepDiveSchema = z.object({
  subsystemId: z.string().min(1),
  behaviours: z.array(analysisBehaviourSchema),
  dataFlow: z.array(analysisDataFlowStepSchema),
  publicInterfaces: z.array(analysisPublicInterfaceSchema),
});

const mergedSubsystemSchema = discoverySubsystemSchema.extend({
  behaviours: z.array(analysisBehaviourSchema),
  dataFlow: z.array(analysisDataFlowStepSchema),
  publicInterfaces: z.array(analysisPublicInterfaceSchema),
});

export const analysisSchema = z.object({
  repo: repoSchema,
  subsystems: z.array(mergedSubsystemSchema).min(1).max(6),
  crossCuttingConcerns: z.array(discoveryCrossCuttingConcernSchema),
});

const citationSchema = z.object({
  n: z.number().int().positive(),
  path: z.string().min(1),
  startLine: lineNumberSchema,
  endLine: lineNumberSchema,
  excerpt: z.string().nullable().optional(),
});

const flowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["input", "core", "branch"]),
});

const flowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().nullable().optional(),
});

export const featurePageOutputSchema = z.object({
  overview: z.string().min(1),
  howItWorks: z.string().min(1),
  citations: z.array(citationSchema),
  diagram: z
    .object({
      nodes: z.array(flowNodeSchema).min(2).max(8),
      edges: z.array(flowEdgeSchema).min(1).max(10),
      caption: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type AnalysisSchema = z.infer<typeof analysisSchema>;
export type AnalysisDiscoverySchema = z.infer<typeof analysisDiscoverySchema>;
export type SubsystemDeepDiveSchema = z.infer<typeof subsystemDeepDiveSchema>;
export type FeaturePageOutputSchema = z.infer<typeof featurePageOutputSchema>;
