import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { [key: string]: JsonValue }
  | JsonValue[];

type DatabaseClient = NeonQueryFunction<false, false>;

let cachedDatabaseClient: DatabaseClient | null = null;
let schemaPromise: Promise<void> | null = null;

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return databaseUrl;
};

export const getDatabaseClient = () => {
  if (!cachedDatabaseClient) {
    cachedDatabaseClient = neon(getDatabaseUrl());
  }

  return cachedDatabaseClient;
};

export const serializeJson = (value: unknown) => JSON.stringify(value ?? null);

export const ensureDatabaseSchema = async () => {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const sql = getDatabaseClient();

    await sql.query(`
      create table if not exists wikis (
        id uuid primary key,
        repo_url text not null,
        repo_sha text not null,
        structure jsonb not null,
        analysis jsonb,
        digest jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (repo_url, repo_sha)
      )
    `);

    await sql.query(`
      create table if not exists jobs (
        id uuid primary key,
        wiki_id uuid,
        repo_url text not null,
        status text not null,
        phase text not null,
        progress integer not null default 0,
        error text,
        openai_response_id text,
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        finished_at timestamptz
      )
    `);

    await sql.query(`
      create index if not exists wikis_repo_sha_idx
      on wikis (repo_url, repo_sha)
    `);

    await sql.query(`
      create index if not exists jobs_status_idx
      on jobs (status, updated_at)
    `);
  })();

  return schemaPromise;
};
