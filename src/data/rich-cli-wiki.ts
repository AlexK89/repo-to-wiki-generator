import type { LogLine, Wiki } from "@/types/wiki";

// Mock wiki for Textualize/rich-cli — illustrative line numbers, real file paths.
// Lets the wiki UI be built + iterated without the backend pipeline.

export const richCliWiki: Wiki = {
  repo: {
    owner: "Textualize",
    name: "rich-cli",
    sha: "8a4f2c1",
    defaultBranch: "main",
    description: "Rich toolbox for fancy output in the terminal",
    stars: 3214,
    language: "Python",
    license: "MIT",
  },
  summary:
    "A command-line companion to the Rich library. Point it at a file, a URL, or stdin and it renders the content beautifully in your terminal — markdown, source code, JSON, CSV, even web pages — with syntax highlighting, themes, and the option to export to HTML or SVG.",
  audience:
    "Developers and power users on the terminal who want pretty, readable output without writing a script for every format.",
  stack: ["Python 3.7+", "Rich", "Click", "Requests"],
  generatedAt: "2026-05-20T14:32:00Z",
  modelVersion: "gpt-5-mini",
  stats: {
    files: 12,
    linesAnalyzed: 1847,
    featuresIdentified: 7,
    citations: 38,
    generationMs: 41200,
  },
  features: [
    {
      slug: "rendering-files",
      title: "Rendering files",
      oneLiner: "Point rich at any file and it picks the right renderer.",
      category: "core",
      page: {
        overview: `The headline feature: %CITE:1%running \`rich path/to/file\`%/CITE% in a terminal renders the contents of that file beautifully — auto-detecting whether it's source code, markdown, JSON, CSV, or plain text. There's no need to choose a format flag for common cases.

Under the hood, file type is inferred from the %CITE:2%extension lookup table%/CITE%, with a fallback to plain syntax-highlighted output. Users can override detection with \`--lexer\` (for source) or one of the explicit format flags (\`--markdown\`, \`--json\`, \`--csv\`, \`--rst\`).

This is the entry point most users hit first, and most of the rest of the CLI's surface (themes, paging, export) layers on top of it.`,
        howItWorks: `When the CLI launches, %CITE:3%the \`main\` Click command%/CITE% collects the resource argument and dispatches to a small router. Local paths and \`-\` (stdin) take one path; URLs take another (see "URLs & web content").

For local files, %CITE:4%the dispatcher inspects the extension%/CITE% and selects a render strategy: \`.md\` → Markdown renderer, \`.csv\` → table renderer, \`.json\` → pretty JSON, anything else falls through to %CITE:5%Rich's \`Syntax\` renderer%/CITE% with the lexer guessed by Pygments.

The rendered output is then handed to the same printing pipeline that powers every other feature — so paging, theming, and exporting all "just work" regardless of how the content was produced.`,
        entryPoints: [
          { kind: "command", name: "rich <path>", signature: "rich <path> [options]", citation: 1 },
          { kind: "command", name: "rich -", signature: "rich - [options]   # read from stdin", citation: 6 },
          { kind: "function", name: "main", signature: "def main(resource: str, ...) -> int", citation: 3 },
          { kind: "function", name: "render_resource", signature: "def render_resource(resource, console, options) -> RenderResult", citation: 4 },
        ],
        diagram: {
          caption:
            "File extension drives renderer selection · URLs detour through the fetcher first",
          nodes: [
            { id: "input", label: "rich <path>", kind: "input" },
            { id: "router", label: "render_resource", kind: "core" },
            { id: "markdown", label: "Markdown", kind: "branch" },
            { id: "syntax", label: "Syntax", kind: "branch" },
            { id: "structured", label: "JSON / CSV", kind: "branch" },
            { id: "url", label: "URL fetcher", kind: "branch" },
          ],
          edges: [
            { from: "input", to: "router" },
            { from: "router", to: "markdown" },
            { from: "router", to: "syntax" },
            { from: "router", to: "structured" },
            { from: "router", to: "url" },
          ],
        },
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 412, endLine: 438, excerpt: "@click.command()\n@click.argument('resource', metavar='<PATH,TEXT,URL,or '-'>')\n@click.option('--print', '-p', is_flag=True, help='Print console markup.')\n# ... 30 more options\ndef main(resource, print, rule, ...):" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 148, endLine: 172, excerpt: "RENDERERS = {\n    'md': render_markdown,\n    'markdown': render_markdown,\n    'json': render_json,\n    'csv': render_csv,\n    'rst': render_rst,\n    # ...\n}" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 412, endLine: 440, excerpt: "@click.command()\ndef main(resource, ...):\n    \"\"\"Rich toolbox for fancy output.\"\"\"\n    console = Console(...)\n    return render_resource(resource, console, options)" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 220, endLine: 268, excerpt: "def render_resource(resource, console, options):\n    suffix = Path(resource).suffix.lstrip('.')\n    renderer = RENDERERS.get(suffix, render_syntax)\n    return renderer(resource, console, options)" },
          { n: 5, path: "src/rich_cli/__main__.py", startLine: 305, endLine: 346, excerpt: "def render_syntax(resource, console, options):\n    syntax = Syntax.from_path(\n        resource,\n        line_numbers=options.line_numbers,\n        theme=options.theme,\n    )\n    console.print(syntax)" },
          { n: 6, path: "src/rich_cli/__main__.py", startLine: 470, endLine: 488, excerpt: "if resource == '-':\n    text = sys.stdin.read()\n    return render_from_stdin(text, console, options)" },
        ],
        related: ["markdown-rendering", "code-syntax-highlighting", "themes-and-styling"],
      },
    },
    {
      slug: "markdown-rendering",
      title: "Markdown rendering",
      oneLiner: "Beautiful in-terminal markdown — headings, lists, code blocks, tables.",
      category: "core",
      page: {
        overview: `Pass a \`.md\` file (or stdin with \`--markdown\`) and rich-cli %CITE:1%renders it with full markdown styling%/CITE%: ATX headings get rules, fenced code blocks are syntax-highlighted, lists nest, and GFM tables align.

The renderer is %CITE:2%a thin wrapper around \`rich.markdown.Markdown\`%/CITE%, with options bolted on for hyperlink behavior, code-block themes, and forced-width rendering for CI/log capture.`,
        howItWorks: `The markdown renderer constructs a %CITE:3%\`Markdown\` instance%/CITE% with the active code theme and hyperlink setting, then prints it to the active console.

Two things deserve note. First, %CITE:4%hyperlinks are emitted using terminal OSC-8 escape codes%/CITE% when the terminal advertises support, falling back to bracketed URLs otherwise. Second, %CITE:5%fenced code blocks reuse the same Pygments lexer guess%/CITE% that the standalone syntax renderer uses, so themes are consistent everywhere.`,
        entryPoints: [
          { kind: "command", name: "rich --markdown", signature: "rich <path.md>  |  rich - --markdown", citation: 1 },
          { kind: "function", name: "render_markdown", signature: "def render_markdown(resource, console, options) -> None", citation: 2 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 386, endLine: 404, excerpt: "@click.option('--markdown', '-m', is_flag=True, help='Force markdown rendering.')" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 268, endLine: 304, excerpt: "def render_markdown(resource, console, options):\n    text = read_text(resource)\n    markdown = Markdown(\n        text,\n        code_theme=options.theme,\n        hyperlinks=options.hyperlinks,\n    )\n    console.print(markdown)" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 274, endLine: 282, excerpt: "markdown = Markdown(\n    text,\n    code_theme=options.theme,\n    hyperlinks=options.hyperlinks,\n    inline_code_lexer=options.inline_code_lexer,\n)" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 290, endLine: 298, excerpt: "if console.is_terminal and supports_osc8():\n    markdown.hyperlinks = True" },
          { n: 5, path: "src/rich_cli/__main__.py", startLine: 268, endLine: 282, excerpt: "Markdown(... code_theme=options.theme ...)" },
        ],
        related: ["rendering-files", "themes-and-styling", "export"],
      },
    },
    {
      slug: "code-syntax-highlighting",
      title: "Code & syntax highlighting",
      oneLiner: "Themed, line-numbered code rendering with Pygments lexers.",
      category: "core",
      page: {
        overview: `Any file rich-cli doesn't recognize as a structured format falls through to the syntax renderer, which uses %CITE:1%Rich's \`Syntax\` class%/CITE% to syntax-highlight code with Pygments. Line numbers, guides, and themes are all configurable.

This is also the renderer behind \`--head\` and \`--tail\` slicing — useful when you want to inspect a portion of a large log or source file without piping through \`less\`.`,
        howItWorks: `The syntax renderer accepts an open file or a path. %CITE:2%It guesses the lexer from the path%/CITE% (or honours \`--lexer\`), constructs a \`Syntax\` object with the selected theme, %CITE:3%applies line-range slicing if \`--head\`/\`--tail\` were given%/CITE%, and hands it to the console.

Themes are sourced from %CITE:4%Pygments' built-in style registry%/CITE%; \`--theme\` accepts any valid name (e.g. \`monokai\`, \`solarized-light\`).`,
        entryPoints: [
          { kind: "command", name: "rich <file.py>", signature: "rich <file> [--lexer NAME] [--theme NAME] [--line-numbers]", citation: 1 },
          { kind: "command", name: "--head / --tail", signature: "rich <file> --head 30   |   rich <file> --tail 100", citation: 3 },
          { kind: "function", name: "render_syntax", signature: "def render_syntax(resource, console, options) -> None", citation: 1 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 305, endLine: 348, excerpt: "def render_syntax(resource, console, options):\n    syntax = Syntax.from_path(\n        resource,\n        line_numbers=options.line_numbers,\n        theme=options.theme,\n        indent_guides=options.guides,\n    )\n    console.print(syntax)" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 320, endLine: 332, excerpt: "lexer = options.lexer or Syntax.guess_lexer(resource)\nsyntax = Syntax.from_path(resource, lexer=lexer, ...)" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 333, endLine: 346, excerpt: "if options.head:\n    syntax.code_lines = syntax.code_lines[: options.head]\nelif options.tail:\n    syntax.code_lines = syntax.code_lines[-options.tail:]" },
          { n: 4, path: "pyproject.toml", startLine: 22, endLine: 28, excerpt: "dependencies = [\n    'rich>=12.0.0',\n    'click>=8.1.0',\n    'requests>=2.27.0',\n    'pygments>=2.10.0',\n]" },
        ],
        related: ["rendering-files", "themes-and-styling"],
      },
    },
    {
      slug: "tables-structured-data",
      title: "Tables & structured data",
      oneLiner: "CSV and JSON render as aligned, themed tables — not raw text.",
      category: "workflow",
      page: {
        overview: `CSV files are rendered as %CITE:1%proper Rich tables%/CITE%, with the first row used as headers, types inferred per column, and numeric columns right-aligned. JSON files are pretty-printed with %CITE:2%syntactic colouring and key alignment%/CITE%.

This is one of the most practically useful features for working with data on the terminal: \`cat data.csv | rich -\` gives a readable table without leaving the shell.`,
        howItWorks: `The CSV renderer %CITE:3%reads the file with Python's \`csv\` module%/CITE%, lazily streams rows into a \`rich.table.Table\`, and prints. Column count is taken from the header row; rows with mismatched length are padded.

The JSON renderer is shorter — %CITE:4%it parses and hands off to \`rich.json.JSON\`%/CITE%, which handles the pretty-printing.`,
        entryPoints: [
          { kind: "command", name: "rich <file.csv>", signature: "rich data.csv [--csv]", citation: 1 },
          { kind: "command", name: "rich <file.json>", signature: "rich data.json [--json]", citation: 2 },
          { kind: "function", name: "render_csv", signature: "def render_csv(resource, console, options) -> None", citation: 3 },
          { kind: "function", name: "render_json", signature: "def render_json(resource, console, options) -> None", citation: 4 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 348, endLine: 384, excerpt: "def render_csv(resource, console, options):\n    table = Table(show_header=True, header_style='bold')\n    reader = csv.reader(open(resource))\n    headers = next(reader)\n    for h in headers: table.add_column(h)\n    for row in reader: table.add_row(*row)\n    console.print(table)" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 385, endLine: 405, excerpt: "def render_json(resource, console, options):\n    text = read_text(resource)\n    console.print(JSON(text, indent=options.indent))" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 351, endLine: 370, excerpt: "reader = csv.reader(open(resource, newline=''))" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 392, endLine: 402, excerpt: "console.print(JSON(text, indent=options.indent))" },
        ],
        related: ["rendering-files", "export"],
      },
    },
    {
      slug: "export",
      title: "Export to HTML & SVG",
      oneLiner: "Save the rendered output as an HTML page or a vector SVG.",
      category: "workflow",
      page: {
        overview: `Every renderer's output can be %CITE:1%captured and written to disk%/CITE% as an HTML document or an SVG, preserving colors, fonts, and layout. The flags are \`--export-html\` and \`--export-svg\`.

This is what makes rich-cli useful for embedding terminal output in blog posts, README files, or PR descriptions — and it's how the Rich project itself generates many of its docs screenshots.`,
        howItWorks: `Export works by %CITE:2%switching the console into \`record=True\` mode%/CITE% before rendering. The renderer runs as normal; afterward, %CITE:3%\`console.export_html()\` or \`export_svg()\`%/CITE% serializes the recorded segments. The SVG export embeds a Rich-styled terminal frame around the content.

Fonts default to a generic monospace stack; \`--export-svg\` accepts a \`--font-family\` override.`,
        entryPoints: [
          { kind: "command", name: "--export-html", signature: "rich <path> --export-html out.html", citation: 1 },
          { kind: "command", name: "--export-svg", signature: "rich <path> --export-svg out.svg [--font-family FAMILY]", citation: 1 },
          { kind: "function", name: "do_export", signature: "def do_export(console, options) -> None", citation: 2 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 502, endLine: 530, excerpt: "@click.option('--export-html', metavar='PATH')\n@click.option('--export-svg', metavar='PATH')" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 540, endLine: 558, excerpt: "console = Console(record=bool(options.export_html or options.export_svg), ...)" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 560, endLine: 582, excerpt: "if options.export_html:\n    console.save_html(options.export_html)\nif options.export_svg:\n    console.save_svg(options.export_svg, title=options.title)" },
        ],
        related: ["rendering-files", "markdown-rendering"],
      },
    },
    {
      slug: "urls-and-web-content",
      title: "URLs & web content",
      oneLiner: "Point rich at a URL and it fetches, then renders.",
      category: "integration",
      page: {
        overview: `rich-cli treats URLs as first-class resources. %CITE:1%Passing an \`http://\` or \`https://\` URL%/CITE% causes the CLI to fetch the resource, %CITE:2%use the response's \`Content-Type\` header%/CITE% to pick a renderer, and then render as normal.

Markdown over HTTP works particularly well — \`rich https://raw.githubusercontent.com/Textualize/rich/main/README.md\` reads cleanly in the terminal.`,
        howItWorks: `The URL handler %CITE:3%uses \`requests\` with a small timeout%/CITE% and streams the body into memory. The chosen renderer is determined by the \`Content-Type\` first, falling back to the URL's path suffix. Plain HTML pages are rendered with %CITE:4%a minimal HTML-to-markdown pre-pass%/CITE% so links and headings survive.

Authentication isn't supported in v1; rich-cli is intended for public content.`,
        entryPoints: [
          { kind: "command", name: "rich <url>", signature: "rich https://example.com/file.md", citation: 1 },
          { kind: "function", name: "fetch_resource", signature: "def fetch_resource(url, options) -> Tuple[str, str]", citation: 3 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 196, endLine: 218, excerpt: "if resource.startswith(('http://', 'https://')):\n    body, content_type = fetch_resource(resource, options)\n    return render_url_body(body, content_type, console, options)" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 442, endLine: 466, excerpt: "def render_url_body(body, content_type, console, options):\n    if 'markdown' in content_type:\n        return render_markdown(body, console, options)\n    if 'json' in content_type:\n        return render_json(body, console, options)\n    # ..." },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 184, endLine: 196, excerpt: "def fetch_resource(url, options):\n    response = requests.get(url, timeout=10, headers={'User-Agent': 'rich-cli'})\n    response.raise_for_status()\n    return response.text, response.headers.get('content-type', '')" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 460, endLine: 472, excerpt: "if 'html' in content_type:\n    body = html_to_markdown(body)\n    return render_markdown(body, console, options)" },
        ],
        related: ["rendering-files", "markdown-rendering"],
      },
    },
    {
      slug: "themes-and-styling",
      title: "Themes & styling",
      oneLiner: "Pygments themes, indent guides, panel borders, force-width.",
      category: "ui",
      page: {
        overview: `Every renderer respects a shared set of styling options: %CITE:1%theme name%/CITE%, %CITE:2%indent guides%/CITE%, line numbers, and a %CITE:3%force-width override%/CITE% for capturing output to fixed-width media (CI logs, screenshots).

Themes are sourced from Pygments and apply to every code-rendering surface — including fenced code in markdown — so output stays visually consistent.`,
        howItWorks: `Styling options are %CITE:4%collected into an \`Options\` dataclass%/CITE% at CLI parse time and threaded through every renderer. Themes themselves are resolved lazily; only when a renderer actually constructs a \`Syntax\` or \`Markdown\` does Pygments load the style.

\`--force-terminal\` and \`--width\` exist for non-TTY use (e.g. piping into a file): they tell Rich to keep colors and to wrap at a chosen width regardless of \`$COLUMNS\`.`,
        entryPoints: [
          { kind: "command", name: "--theme", signature: "rich <path> --theme monokai | solarized-light | ...", citation: 1 },
          { kind: "command", name: "--guides", signature: "rich <path> --guides", citation: 2 },
          { kind: "command", name: "--width", signature: "rich <path> --width 80 --force-terminal", citation: 3 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 56, endLine: 70, excerpt: "@click.option('--theme', default='ansi_dark', help='Theme for syntax.')" },
          { n: 2, path: "src/rich_cli/__main__.py", startLine: 88, endLine: 96, excerpt: "@click.option('--guides', is_flag=True, help='Show indent guides.')" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 102, endLine: 124, excerpt: "@click.option('--width', '-w', type=int, default=None)\n@click.option('--force-terminal', is_flag=True)" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 130, endLine: 148, excerpt: "@dataclass\nclass Options:\n    theme: str\n    guides: bool\n    width: Optional[int]\n    line_numbers: bool\n    # ..." },
        ],
        related: ["code-syntax-highlighting", "markdown-rendering"],
      },
    },
    {
      slug: "pager-and-piping",
      title: "Paging, piping & printing",
      oneLiner: "Plays nicely with stdin, pagers, and being part of a unix pipeline.",
      category: "ops",
      page: {
        overview: `rich-cli is unix-shell-shaped. It reads from %CITE:1%stdin via \`-\`%/CITE%, writes plain ANSI to stdout when not a TTY, and %CITE:2%pages long output through \`less\`%/CITE% when \`--pager\` is set.

This is what lets it slot into existing workflows — \`curl ... | rich -\`, \`rich big.md --pager\`, \`rich script.py | tee out.txt\`.`,
        howItWorks: `When \`resource == "-"\`, %CITE:3%the CLI reads all of stdin%/CITE% before rendering. To pick a renderer it relies on explicit flags (\`--markdown\`, \`--json\`, etc.) — there's no MIME sniffing on stdin.

Paging works by %CITE:4%capturing the rendered output into a string buffer, then handing it to \`pydoc.pager\`%/CITE%, which respects the \`$PAGER\` environment variable. The \`--print\` flag bypasses paging entirely.`,
        entryPoints: [
          { kind: "command", name: "rich -", signature: "cat file.md | rich - --markdown", citation: 1 },
          { kind: "command", name: "--pager", signature: "rich big.md --pager", citation: 2 },
          { kind: "command", name: "--print", signature: "rich short.md --print", citation: 4 },
        ],
        diagram: null,
        citations: [
          { n: 1, path: "src/rich_cli/__main__.py", startLine: 470, endLine: 488, excerpt: "if resource == '-':\n    text = sys.stdin.read()\n    return render_from_stdin(text, console, options)" },
          { n: 2, path: "src/rich_cli/pager.py", startLine: 1, endLine: 24, excerpt: "import pydoc\n\ndef page(rendered: str) -> None:\n    pydoc.pager(rendered)" },
          { n: 3, path: "src/rich_cli/__main__.py", startLine: 474, endLine: 482, excerpt: "text = sys.stdin.read()" },
          { n: 4, path: "src/rich_cli/__main__.py", startLine: 583, endLine: 602, excerpt: "if options.pager:\n    buf = console.export_text(clear=False)\n    from .pager import page\n    page(buf)" },
        ],
        related: ["rendering-files", "export"],
      },
    },
  ],
};

export const richCliLog: LogLine[] = [
  { type: "step", text: "Resolving repository", detail: "github.com/Textualize/rich-cli" },
  { type: "info", text: "Default branch: main · HEAD: 8a4f2c1" },
  { type: "step", text: "Fetching file tree" },
  { type: "info", text: "847 paths, 12 source files matched importance filter" },
  { type: "step", text: "Reading manifests" },
  { type: "info", text: "pyproject.toml · README.md · CHANGELOG.md" },
  { type: "step", text: "Analyzing structure", detail: "gpt-5-mini · 1,842 tokens in" },
  { type: "ai", text: 'Repo summary: "A command-line companion to the Rich library…"' },
  { type: "ai", text: "Identified 7 user-facing features:" },
  { type: "feature", text: "  ● Rendering files", category: "core" },
  { type: "feature", text: "  ● Markdown rendering", category: "core" },
  { type: "feature", text: "  ● Code & syntax highlighting", category: "core" },
  { type: "feature", text: "  ● Tables & structured data", category: "workflow" },
  { type: "feature", text: "  ● Export to HTML & SVG", category: "workflow" },
  { type: "feature", text: "  ● URLs & web content", category: "integration" },
  { type: "feature", text: "  ● Themes & styling", category: "ui" },
  { type: "feature", text: "  ● Paging, piping & printing", category: "ops" },
  { type: "step", text: "Drafting feature pages", detail: "8 in parallel · gpt-5-mini" },
  { type: "page", text: "✓ Rendering files            6 citations · 412ms" },
  { type: "page", text: "✓ Code & syntax highlighting 4 citations · 488ms" },
  { type: "page", text: "✓ Markdown rendering         5 citations · 502ms" },
  { type: "page", text: "✓ Tables & structured data   4 citations · 533ms" },
  { type: "page", text: "✓ Themes & styling           4 citations · 561ms" },
  { type: "page", text: "✓ URLs & web content         4 citations · 578ms" },
  { type: "page", text: "✓ Export to HTML & SVG       3 citations · 612ms" },
  { type: "page", text: "✓ Paging, piping & printing  4 citations · 641ms" },
  { type: "step", text: "Validating citations" },
  { type: "info", text: "38/38 citations resolve to real line ranges" },
  { type: "step", text: "Caching wiki", detail: "Textualize/rich-cli@8a4f2c1" },
  { type: "done", text: "Wiki ready · 41.2s · $0.08" },
];
