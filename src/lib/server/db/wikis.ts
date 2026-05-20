import { randomUUID } from "node:crypto";

import type { Analysis } from "@/types/analysis";
import type { Wiki } from "@/types/wiki";
import type { RepositoryDigest } from "../github/digest";
import { ensureDatabaseSchema, getDatabaseClient, serializeJson } from "./client";
import type { JsonValue } from "./client";

export type PersistedWiki = {
  id: string;
  repoUrl: string;
  repoSha: string;
  structure: Wiki;
  createdAt: string;
  updatedAt: string;
};

export type UpsertWikiInput = {
  repoUrl: string;
  repoSha: string;
  structure: Wiki;
  analysis?: Analysis;
  digest?: RepositoryDigest;
};

type WikiRow = {
  id: string;
  repoUrl: string;
  repoSha: string;
  structure: JsonValue;
  createdAt: string;
  updatedAt: string;
};

const mapWikiRow = (row: WikiRow): PersistedWiki => ({
  id: row.id,
  repoUrl: row.repoUrl,
  repoSha: row.repoSha,
  structure: row.structure as Wiki,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const findWikiByRepoSha = async (
  repoUrl: string,
  repoSha: string,
): Promise<PersistedWiki | null> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(
    `
      select
        id,
        repo_url as "repoUrl",
        repo_sha as "repoSha",
        structure,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from wikis
      where repo_url = $1 and repo_sha = $2
      limit 1
    `,
    [repoUrl, repoSha],
  )) as WikiRow[];

  return rows[0] ? mapWikiRow(rows[0]) : null;
};

export const getWikiById = async (
  wikiId: string,
): Promise<PersistedWiki | null> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(
    `
      select
        id,
        repo_url as "repoUrl",
        repo_sha as "repoSha",
        structure,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from wikis
      where id = $1
      limit 1
    `,
    [wikiId],
  )) as WikiRow[];

  return rows[0] ? mapWikiRow(rows[0]) : null;
};

export const upsertWiki = async ({
  repoUrl,
  repoSha,
  structure,
  analysis,
  digest,
}: UpsertWikiInput): Promise<PersistedWiki> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(
    `
      insert into wikis (
        id,
        repo_url,
        repo_sha,
        structure,
        analysis,
        digest
      )
      values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
      on conflict (repo_url, repo_sha)
      do update set
        structure = excluded.structure,
        analysis = excluded.analysis,
        digest = excluded.digest,
        updated_at = now()
      returning
        id,
        repo_url as "repoUrl",
        repo_sha as "repoSha",
        structure,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      randomUUID(),
      repoUrl,
      repoSha,
      serializeJson(structure),
      serializeJson(analysis),
      serializeJson(digest),
    ],
  )) as WikiRow[];

  const row = rows[0];
  if (!row) throw new Error("Failed to persist wiki");

  return mapWikiRow(row);
};
