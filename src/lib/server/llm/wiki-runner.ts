import type { Wiki } from "@/types/wiki";
import type { Analysis } from "@/types/analysis";
import { buildRepositoryDigest } from "../github/digest";
import type { RepositoryDigest, RepositoryDigestOptions } from "../github/digest";
import { assembleWiki } from "./assemble-wiki";
import { runRepositoryAnalysis } from "./analysis-runner";
import { renderSubsystemPages } from "./page-runner";

export type GenerateWikiInput = {
  repoUrl: string;
  digestOptions?: RepositoryDigestOptions;
};

export type GenerateWikiResult = {
  wiki: Wiki;
  analysis: Analysis;
  digest: RepositoryDigest;
};

export const generateWikiFromRepositoryUrl = async ({
  repoUrl,
  digestOptions = {},
}: GenerateWikiInput): Promise<GenerateWikiResult> => {
  const startedAt = Date.now();
  const digest = await buildRepositoryDigest(repoUrl, digestOptions);
  const analysis = await runRepositoryAnalysis({ digest });
  const pages = await renderSubsystemPages({ analysis, digest });
  const wiki = assembleWiki({ analysis, digest, pages, startedAt });

  return { wiki, analysis, digest };
};
