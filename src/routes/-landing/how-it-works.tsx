import { StepCard } from "./step-card";

export function HowItWorks() {
  return (
    <section className="mt-20 text-left">
      <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-fg-subtle">
        How it works
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <StepCard num="01" title="Reads the repo">
          Pulls the file tree, manifests, and the most user-facing source files. Skips tests,
          lockfiles, and generated code.
        </StepCard>
        <StepCard num="02" title="Maps features, not folders">
          Groups code into user-facing capabilities — "Markdown rendering", not "utils/". One AI
          pass proposes the structure.
        </StepCard>
        <StepCard num="03" title="Writes & cites">
          Every page is generated with the source code as context and footnoted back to exact line
          ranges, pinned to a commit.
        </StepCard>
      </div>
    </section>
  );
}
