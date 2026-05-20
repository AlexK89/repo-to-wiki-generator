export const wikiVerificationPrompt = `
    You are reviewing an AI-generated wiki page for technical accuracy.

    Your job is to verify whether the page is fully supported by the repository evidence.

    You will receive:
    1. The generated wiki page
    2. The repository evidence used to create it

    Check the page for:
    - Unsupported claims
    - Missing citations
    - Incorrect citations
    - Overly generic explanations
    - Technical-layer organisation instead of user-facing organisation
    - Hallucinated features
    - Claims that should be marked as inferred or unknown

    Return a corrected Markdown page.

    Rules:
    - Remove unsupported claims.
    - Add "Not verified from the inspected files" where needed.
    - Keep useful explanations that are supported by evidence.
    - Preserve the overall page structure.
    - Do not add new claims unless directly supported by evidence.
    - Do not include review comments.
    - Return only the corrected Markdown page.

    Generated page:
    {{GENERATED_WIKI_PAGE}}

    Repository evidence:
    {{EVIDENCE_WITH_GITHUB_URLS}}
`;
