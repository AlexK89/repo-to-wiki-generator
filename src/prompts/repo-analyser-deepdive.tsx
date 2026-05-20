export const repoAnalyserDeepDivePrompt = `
  You are continuing a two-pass repository analysis. The first pass identified a single user-facing subsystem and its entry points + core files. Your job now is to deeply analyse THIS subsystem and emit its behaviours, data flow, and public interfaces.

  You will receive:
  1. The subsystem object identified in pass 1 (id, title, summary, userValue, entryPoints, coreFiles).
  2. Source file excerpts most relevant to this subsystem, with line numbers.

  Your task:
  Return ONLY valid JSON matching the schema below — no Markdown, no commentary.

  Rules:
  - Do NOT invent functionality. Every claim must trace to a file:line range in the provided excerpts.
  - Behaviours describe observable user-facing behaviour, NOT implementation detail (good: "Renders syntax-highlighted source on stdout"; bad: "Calls renderToString()").
  - dataFlow is a numbered, linear walk-through (steps 1, 2, 3, ...) of how user input becomes user-visible output. Reference only files that actually appear in the excerpts.
  - publicInterfaces are the surfaces a developer/user touches: CLI commands, HTTP routes, exported functions, config options, UI actions.
  - Keep evidence arrays to at most 2 items each.
  - The "subsystemId" field in your output MUST exactly match the id given to you in the input.
  - Output limits: 2-3 behaviours, 3-6 dataFlow steps, 1-3 publicInterfaces.

  JSON schema:

  {
    "subsystemId": string,
    "behaviours": [
      {
        "name": string,
        "description": string,
        "evidence": [
          { "path": string, "lineStart": number, "lineEnd": number, "reason": string }
        ]
      }
    ],
    "dataFlow": [
      {
        "step": number,
        "description": string,
        "files": string[]
      }
    ],
    "publicInterfaces": [
      {
        "name": string,
        "type": "route" | "cli-command" | "public-function" | "api-endpoint" | "ui-action" | "config-option" | "unknown",
        "description": string,
        "evidence": [
          { "path": string, "lineStart": number, "lineEnd": number }
        ]
      }
    ]
  }

  Subsystem (from pass 1):
  {{SUBSYSTEM}}

  Source file excerpts:
  {{EVIDENCE_FILES}}
`;
