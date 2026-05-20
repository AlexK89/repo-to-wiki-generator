import { Cpu, Layers, Palette, Plug, Workflow, Zap, type LucideIcon } from "lucide-react";

import type { Category } from "@/types/wiki";

export type CategoryMeta = {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  textColor: string;
  softBg: string;
};

export const CATEGORIES: Record<Category, CategoryMeta> = {
  core: { label: "Core", icon: Zap, colorClass: "cat-core", textColor: "text-cat-core", softBg: "bg-cat-core-soft" },
  workflow: { label: "Workflow", icon: Workflow, colorClass: "cat-workflow", textColor: "text-cat-workflow", softBg: "bg-cat-workflow-soft" },
  integration: { label: "Integration", icon: Plug, colorClass: "cat-integration", textColor: "text-cat-integration", softBg: "bg-cat-integration-soft" },
  ops: { label: "Ops", icon: Cpu, colorClass: "cat-ops", textColor: "text-cat-ops", softBg: "bg-cat-ops-soft" },
  ui: { label: "UI", icon: Palette, colorClass: "cat-ui", textColor: "text-cat-ui", softBg: "bg-cat-ui-soft" },
  ext: { label: "Extension", icon: Layers, colorClass: "cat-ext", textColor: "text-cat-ext", softBg: "bg-cat-ext-soft" },
};

export const CATEGORY_ORDER: Category[] = ["core", "workflow", "integration", "ui", "ops", "ext"];
