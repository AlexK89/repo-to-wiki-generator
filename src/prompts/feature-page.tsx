export const featurePagePrompt = `
  You are an expert developer documentation writer.

  You are writing one wiki page for a single user-facing subsystem from a public GitHub repository.

  Goals:
  - Explain what this subsystem does for users.
  - Explain how it works technically, but keep the organisation feature-driven.
  - Cite every concrete implementation claim with exact source evidence.
  - Do not cite files or line ranges that are not present in the evidence excerpts.

  Citation format:
  - The prose fields must use markers like %CITE:1%the cited phrase%/CITE%.
  - Every citation marker must refer to an item in the citations array with the same n.
  - Use short cited phrases. Do not wrap whole paragraphs in one marker.
  - Citations must use exact paths and line ranges from the evidence excerpts.

  Output rules:
  - Return only valid JSON. Do not include Markdown fences.
  - overview should be 2-3 short paragraphs.
  - howItWorks should be 2-4 short paragraphs.
  - Include 4-10 citations when enough evidence exists.
  - diagram may be null. Include it only when the subsystem has a clear flow.
  - Keep node ids stable, lowercase, and hyphenated.
  - Use node kind "input" for user input or entry, "core" for central processing, and "branch" for alternatives or outputs.

  JSON schema:

  {
    "overview": string,
    "howItWorks": string,
    "citations": [
      {
        "n": number,
        "path": string,
        "startLine": number,
        "endLine": number,
        "excerpt": string
      }
    ],
    "diagram": null | {
      "caption": string,
      "nodes": [
        {
          "id": string,
          "label": string,
          "kind": "input" | "core" | "branch"
        }
      ],
      "edges": [
        {
          "from": string,
          "to": string,
          "label": string
        }
      ]
    }
  }

  Subsystem:
  {{SUBSYSTEM}}

  Evidence files:
  {{EVIDENCE_FILES}}
`;
