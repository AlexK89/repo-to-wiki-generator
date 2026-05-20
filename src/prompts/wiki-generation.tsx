export const wikiGenerationPrompt = `
    You are a senior engineer writing developer documentation for a generated repository wiki.

    Your task is to write one wiki page for a user-facing subsystem.

    The page must be useful to a real engineer trying to understand the repository.

    You will receive:
    1. Repository analysis JSON
    2. One subsystem object
    3. Source evidence with file paths, line ranges, and GitHub URLs

    Write a Markdown page.

    Rules:
    - Explain what the subsystem does from a user/product perspective.
    - Include technical implementation details, but do not organise the page by technical layers.
    - Every meaningful implementation claim must include an inline citation.
    - Citations must link to the exact GitHub file and line range.
    - Do not cite unrelated files.
    - Do not invent behaviour.
    - If behaviour is inferred rather than explicit, say so.
    - Keep the writing concise, clear, and practical.
    - Use British English.

    Citation format:
    Use Markdown links like this:

    [filename.ts:12-34](https://github.com/org/repo/blob/main/path/filename.ts#L12-L34)

    Required page structure:

    # {{SUBSYSTEM_TITLE}}

    ## Overview
    Explain the subsystem in 2–4 sentences.

    ## What problem it solves
    Explain the user-facing value of this subsystem.

    ## Main entry points
    List the routes, commands, functions, components, APIs, or config options that act as entry points.

    Use this format:
    - "name" — description. Citation.

    ## How it works
    Explain the flow step by step.

    Use this format:
    1. User/system action.
    2. What code handles it.
    3. What state, data, or side effect changes.
    4. What output the user sees or receives.

    ## Important implementation details
    Explain the key technical details that matter for understanding or maintaining this subsystem.

    Use subsections where helpful.

    ## Public interfaces
    Document anything another developer would call, configure, or interact with.

    Examples:
    - CLI commands
    - exported functions
    - API endpoints
    - routes
    - UI actions
    - config options

    ## Data flow
    Describe the main data flow in this subsystem.

    If useful, include a simple Mermaid diagram.

    ## Error handling and edge cases
    Describe known or visible error handling.

    If not enough evidence exists, say:
    "Error handling is not clearly visible from the inspected files."

    ## Related files
    List important files with a short explanation.

    ## Limitations or open questions
    List only limitations supported by the code evidence or obvious from missing code.

    Input repository analysis:
    {{REPO_ANALYSIS_JSON}}

    Subsystem to document:
    {{SUBSYSTEM_JSON}}

    Evidence:
    {{EVIDENCE_WITH_GITHUB_URLS}}
`;
