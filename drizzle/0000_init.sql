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
);

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
);

create index if not exists wikis_repo_sha_idx on wikis (repo_url, repo_sha);
create index if not exists jobs_status_idx on jobs (status, updated_at);
