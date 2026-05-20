import { FeatureCard } from "./feature-card";
import { useWiki } from "./wiki-context";

type Props = {
  wikiId: string;
};

export function OverviewPage({ wikiId }: Props) {
  const { wiki } = useWiki();

  return (
    <article className="fade-in pb-20">
      <header className="mb-7">
        <div className="mb-3.5 font-mono text-xs text-fg-subtle">
          {wiki.repo.owner}/{wiki.repo.name}
        </div>
        <h1 className="mb-3.5 text-5xl font-semibold leading-[1.05] tracking-tight text-fg">
          {wiki.repo.name}
        </h1>
        <p className="max-w-[68ch] text-lg leading-relaxed text-fg-muted">
          {wiki.summary}
        </p>
      </header>

      <div className="mb-9 grid grid-cols-4 overflow-hidden rounded-md border border-border bg-bg-elev shadow-sm">
        <Stat label="Files analyzed" value={wiki.stats.files.toString()} />
        <Stat
          label="Lines read"
          value={wiki.stats.linesAnalyzed.toLocaleString()}
        />
        <Stat label="Features" value={wiki.features.length.toString()} />
        <Stat
          label="Citations"
          value={wiki.stats.citations.toString()}
          isLast
        />
      </div>

      <div className="mb-9 grid grid-cols-2 gap-4">
        <InfoCard title="Who uses it">
          <p className="text-sm leading-relaxed text-fg">{wiki.audience}</p>
        </InfoCard>
        <InfoCard title="Stack">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {wiki.stack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-bg-subtle px-2 py-0.5 font-mono text-xs text-fg-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </InfoCard>
      </div>

      <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">
        Features
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {wiki.features.map((feature) => (
          <FeatureCard key={feature.slug} feature={feature} wikiId={wikiId} />
        ))}
      </div>
    </article>
  );
}

type StatProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function Stat({ label, value, isLast }: StatProps) {
  return (
    <div
      className={
        isLast
          ? "px-4.5 py-4"
          : "border-r border-border px-4.5 py-4"
      }
    >
      <div className="text-2xl font-semibold tracking-tight text-fg tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
    </div>
  );
}

type InfoCardProps = {
  title: string;
  children: React.ReactNode;
};

function InfoCard({ title, children }: InfoCardProps) {
  return (
    <div className="rounded-md border border-border bg-bg-elev px-4.5 py-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {title}
      </div>
      {children}
    </div>
  );
}
