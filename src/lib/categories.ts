import {
  Cpu,
  Layers,
  Palette,
  Plug,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { CategorySlot, Feature, Wiki, WikiCategory } from "@/types/wiki";

export type CategoryStyle = {
  icon: LucideIcon;
  colorClass: string;
  textColor: string;
  softBg: string;
};

export type WikiCategoryGroup = {
  category: WikiCategory;
  style: CategoryStyle;
  features: Feature[];
};

const DEFAULT_SLOT_LABELS: Record<CategorySlot, string> = {
  core: "Core",
  workflow: "Workflow",
  integration: "Integration",
  ops: "Operations",
  ui: "Interface",
  ext: "Extensions",
};

export const CATEGORY_STYLE_SLOTS: Record<CategorySlot, CategoryStyle> = {
  core: {
    icon: Zap,
    colorClass: "cat-core",
    textColor: "text-cat-core",
    softBg: "bg-cat-core-soft",
  },
  workflow: {
    icon: Workflow,
    colorClass: "cat-workflow",
    textColor: "text-cat-workflow",
    softBg: "bg-cat-workflow-soft",
  },
  integration: {
    icon: Plug,
    colorClass: "cat-integration",
    textColor: "text-cat-integration",
    softBg: "bg-cat-integration-soft",
  },
  ops: {
    icon: Cpu,
    colorClass: "cat-ops",
    textColor: "text-cat-ops",
    softBg: "bg-cat-ops-soft",
  },
  ui: {
    icon: Palette,
    colorClass: "cat-ui",
    textColor: "text-cat-ui",
    softBg: "bg-cat-ui-soft",
  },
  ext: {
    icon: Layers,
    colorClass: "cat-ext",
    textColor: "text-cat-ext",
    softBg: "bg-cat-ext-soft",
  },
};

export const CATEGORY_STYLE_ORDER: CategorySlot[] = [
  "core",
  "workflow",
  "integration",
  "ui",
  "ops",
  "ext",
];

const isCategorySlot = (value: string): value is CategorySlot =>
  CATEGORY_STYLE_ORDER.includes(value as CategorySlot);

const titleizeCategoryId = (categoryId: string) =>
  categoryId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const createFallbackCategory = (
  categoryId: string,
  index: number,
): WikiCategory => {
  const slot = isCategorySlot(categoryId)
    ? categoryId
    : CATEGORY_STYLE_ORDER[index % CATEGORY_STYLE_ORDER.length];

  return {
    id: categoryId,
    label: isCategorySlot(categoryId)
      ? DEFAULT_SLOT_LABELS[categoryId]
      : titleizeCategoryId(categoryId),
    slot,
  };
};

export const getCategoryStyle = (slot: CategorySlot) =>
  CATEGORY_STYLE_SLOTS[slot];

export const getWikiCategories = (wiki: Pick<Wiki, "categories" | "features">) => {
  if (wiki.categories.length > 0) return wiki.categories;

  const seenCategoryIds = new Set<string>();

  return wiki.features.flatMap((feature) => {
    if (seenCategoryIds.has(feature.category)) return [];
    seenCategoryIds.add(feature.category);
    return createFallbackCategory(feature.category, seenCategoryIds.size - 1);
  });
};

export const resolveWikiCategory = (
  wiki: Pick<Wiki, "categories" | "features">,
  categoryId: string,
) =>
  getWikiCategories(wiki).find((category) => category.id === categoryId) ??
  createFallbackCategory(categoryId, getWikiCategories(wiki).length);

export const getWikiCategoryGroups = (
  wiki: Pick<Wiki, "categories" | "features">,
): WikiCategoryGroup[] =>
  getWikiCategories(wiki)
    .map((category) => ({
      category,
      style: getCategoryStyle(category.slot),
      features: wiki.features.filter((feature) => feature.category === category.id),
    }))
    .filter((group) => group.features.length > 0);
