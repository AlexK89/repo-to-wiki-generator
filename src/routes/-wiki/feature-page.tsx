import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { resolveWikiCategory } from "@/lib/categories";
import type { Feature, Wiki } from "@/types/wiki";
import { EntryPoint } from "./entry-point";
import { FeatureFlow } from "./feature-flow";
import { ProseWithCitations } from "./prose-with-citations";
import { RelatedFeatures } from "./related-features";
import { SourcesList } from "./sources-list";
import { TableOfContents, type TocItem } from "./table-of-contents";

type Props = {
  feature: Feature;
  wiki: Wiki;
  wikiId: string;
};

export function FeaturePage({ feature, wiki, wikiId }: Props) {
  const page = feature.page;
  const relatedFeatures = page.related
    .map((slug) => wiki.features.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is Feature => Boolean(candidate));

  const toc: TocItem[] = [
    { id: "overview", label: "Overview" },
    { id: "how-it-works", label: "How it works" },
    ...(page.diagram ? [{ id: "flow", label: "Flow" }] : []),
    ...(page.entryPoints.length > 0
      ? [{ id: "entry-points", label: "Entry points" }]
      : []),
    { id: "sources", label: "Sources" },
    ...(relatedFeatures.length > 0
      ? [{ id: "related", label: "Related" }]
      : []),
  ];

  return (
    <div className="flex gap-12">
      <article className="fade-in min-w-0 flex-1 pb-20">
        <Breadcrumb feature={feature} wiki={wiki} wikiId={wikiId} />

        <h1 className="mb-3 text-[38px] font-semibold leading-[1.1] tracking-tight text-fg">
          {feature.title}
        </h1>
        <p className="max-w-[70ch] text-lg leading-relaxed text-fg-muted">
          {feature.oneLiner}
        </p>

        <Section id="overview" title="Overview">
          <ProseWithCitations
            text={page.overview}
            citations={page.citations}
            repo={wiki.repo}
          />
        </Section>

        <Section id="how-it-works" title="How it works">
          <ProseWithCitations
            text={page.howItWorks}
            citations={page.citations}
            repo={wiki.repo}
          />
        </Section>

        {page.diagram && (
          <Section id="flow" title="Flow">
            <FeatureFlow diagram={page.diagram} />
          </Section>
        )}

        {page.entryPoints.length > 0 && (
          <Section id="entry-points" title="Entry points">
            <div className="grid grid-cols-1 gap-2.5">
              {page.entryPoints.map((entryPoint, index) => (
                <EntryPoint
                  key={`${entryPoint.kind}-${entryPoint.name}-${index}`}
                  entryPoint={entryPoint}
                  citations={page.citations}
                  repo={wiki.repo}
                />
              ))}
            </div>
          </Section>
        )}

        <Section id="sources" title="Sources">
          <SourcesList citations={page.citations} repo={wiki.repo} />
        </Section>

        {relatedFeatures.length > 0 && (
          <Section id="related" title="Related" isTight>
            <RelatedFeatures features={relatedFeatures} wikiId={wikiId} />
          </Section>
        )}
      </article>

      <TableOfContents items={toc} />
    </div>
  );
}

type BreadcrumbProps = {
  feature: Feature;
  wiki: Wiki;
  wikiId: string;
};

function Breadcrumb({ feature, wiki, wikiId }: BreadcrumbProps) {
  const category = resolveWikiCategory(wiki, feature.category);

  return (
    <div className="mb-4 flex items-center gap-2 text-[12.5px] text-fg-subtle">
      <Link
        to="/wiki/$wikiId"
        params={{ wikiId }}
        className="transition-colors hover:text-fg"
      >
        {wiki.repo.owner}/{wiki.repo.name}
      </Link>
      <ChevronRight size={12} />
      <CategoryBadge category={category} size="sm" />
    </div>
  );
}

type SectionProps = {
  id: string;
  title: string;
  isTight?: boolean;
  children: React.ReactNode;
};

function Section({ id, title, isTight, children }: SectionProps) {
  return (
    <section
      id={id}
      className={isTight ? "mt-7 scroll-mt-24" : "mt-9 scroll-mt-24"}
    >
      <h2 className="mb-3.5 text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">
        {title}
      </h2>
      <div className="prose max-w-none">{children}</div>
    </section>
  );
}
