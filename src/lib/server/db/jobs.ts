import { randomUUID } from "node:crypto";

import type { AnalyzeJobPhase, AnalyzeJobStatus } from "@/types/job";
import { ensureDatabaseSchema, getDatabaseClient, serializeJson } from "./client";
import type { JsonValue } from "./client";

export type AnalyzeJobRow = {
  id: string;
  repoUrl: string;
  status: AnalyzeJobStatus;
  phase: AnalyzeJobPhase;
  progress: number;
  data: JsonValue;
  createdAt: string;
  updatedAt: string;
  wikiId: string | null;
  error: string | null;
  openaiResponseId: string | null;
  finishedAt: string | null;
};

export type CreateAnalyzeJobInput = {
  repoUrl: string;
  status: AnalyzeJobStatus;
  phase: AnalyzeJobPhase;
  progress: number;
  data: unknown;
  wikiId?: string | null;
  error?: string | null;
  openaiResponseId?: string | null;
  finishedAt?: string | null;
};

export type UpdateAnalyzeJobInput = Partial<{
  status: AnalyzeJobStatus;
  phase: AnalyzeJobPhase;
  progress: number;
  data: unknown;
  wikiId: string | null;
  error: string | null;
  openaiResponseId: string | null;
  finishedAt: string | null;
}>;

type AnalyzeJobDbRow = {
  id: string;
  repoUrl: string;
  status: string;
  phase: string;
  progress: number;
  data: JsonValue;
  createdAt: string;
  updatedAt: string;
  wikiId: string | null;
  error: string | null;
  openaiResponseId: string | null;
  finishedAt: string | null;
};

const mapAnalyzeJobRow = (row: AnalyzeJobDbRow): AnalyzeJobRow => ({
  ...row,
  status: row.status as AnalyzeJobStatus,
  phase: row.phase as AnalyzeJobPhase,
});

const selectAnalyzeJobSql = `
  select
    id,
    repo_url as "repoUrl",
    status,
    phase,
    progress,
    data,
    created_at as "createdAt",
    updated_at as "updatedAt",
    wiki_id as "wikiId",
    error,
    openai_response_id as "openaiResponseId",
    finished_at as "finishedAt"
  from jobs
`;

export const createAnalyzeJob = async ({
  repoUrl,
  status,
  phase,
  progress,
  data,
  wikiId = null,
  error = null,
  openaiResponseId = null,
  finishedAt = null,
}: CreateAnalyzeJobInput): Promise<AnalyzeJobRow> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(
    `
      insert into jobs (
        id,
        repo_url,
        status,
        phase,
        progress,
        data,
        wiki_id,
        error,
        openai_response_id,
        finished_at
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
      returning
        id,
        repo_url as "repoUrl",
        status,
        phase,
        progress,
        data,
        created_at as "createdAt",
        updated_at as "updatedAt",
        wiki_id as "wikiId",
        error,
        openai_response_id as "openaiResponseId",
        finished_at as "finishedAt"
    `,
    [
      randomUUID(),
      repoUrl,
      status,
      phase,
      progress,
      serializeJson(data),
      wikiId,
      error,
      openaiResponseId,
      finishedAt,
    ],
  )) as AnalyzeJobDbRow[];

  const row = rows[0];
  if (!row) throw new Error("Failed to create analysis job");

  return mapAnalyzeJobRow(row);
};

export const claimAnalyzeJob = async (
  jobId: string,
): Promise<AnalyzeJobRow | null> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(
    `
      update jobs
      set updated_at = now()
      where id = $1
        and status in ('analyzing', 'writing')
        and updated_at < now() - interval '10 seconds'
      returning
        id,
        repo_url as "repoUrl",
        status,
        phase,
        progress,
        data,
        created_at as "createdAt",
        updated_at as "updatedAt",
        wiki_id as "wikiId",
        error,
        openai_response_id as "openaiResponseId",
        finished_at as "finishedAt"
    `,
    [jobId],
  )) as AnalyzeJobDbRow[];

  return rows[0] ? mapAnalyzeJobRow(rows[0]) : null;
};

export const getAnalyzeJob = async (
  jobId: string,
): Promise<AnalyzeJobRow | null> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const rows = (await sql.query(`${selectAnalyzeJobSql} where id = $1 limit 1`, [
    jobId,
  ])) as AnalyzeJobDbRow[];

  return rows[0] ? mapAnalyzeJobRow(rows[0]) : null;
};

export const updateAnalyzeJob = async (
  job: AnalyzeJobRow,
  updates: UpdateAnalyzeJobInput,
  options: { force?: boolean } = {},
): Promise<AnalyzeJobRow> => {
  await ensureDatabaseSchema();
  const sql = getDatabaseClient();
  const nextJob = {
    status: updates.status ?? job.status,
    phase: updates.phase ?? job.phase,
    progress: updates.progress ?? job.progress,
    data: updates.data ?? job.data,
    wikiId: updates.wikiId === undefined ? job.wikiId : updates.wikiId,
    error: updates.error === undefined ? job.error : updates.error,
    openaiResponseId:
      updates.openaiResponseId === undefined
        ? job.openaiResponseId
        : updates.openaiResponseId,
    finishedAt:
      updates.finishedAt === undefined ? job.finishedAt : updates.finishedAt,
  };
  const rows = (await sql.query(
    `
      update jobs
      set
        status = $2,
        phase = $3,
        progress = $4,
        data = $5::jsonb,
        wiki_id = $6,
        error = $7,
        openai_response_id = $8,
        finished_at = $9,
        updated_at = now()
      where id = $1${options.force ? "" : " and updated_at = $10"}
      returning
        id,
        repo_url as "repoUrl",
        status,
        phase,
        progress,
        data,
        created_at as "createdAt",
        updated_at as "updatedAt",
        wiki_id as "wikiId",
        error,
        openai_response_id as "openaiResponseId",
        finished_at as "finishedAt"
    `,
    [
      job.id,
      nextJob.status,
      nextJob.phase,
      nextJob.progress,
      serializeJson(nextJob.data),
      nextJob.wikiId,
      nextJob.error,
      nextJob.openaiResponseId,
      nextJob.finishedAt,
      ...(options.force ? [] : [job.updatedAt]),
    ],
  )) as AnalyzeJobDbRow[];

  const row = rows[0];
  if (!row) {
    const current = await getAnalyzeJob(job.id);
    if (!current) throw new Error(`Job ${job.id} no longer exists`);
    return current;
  }

  return mapAnalyzeJobRow(row);
};
