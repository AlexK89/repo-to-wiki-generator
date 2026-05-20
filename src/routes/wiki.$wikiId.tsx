import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";

import { richCliWiki } from "@/data/rich-cli-wiki";
import { getWikiRequest } from "@/lib/client/api";
import { useDarkMode } from "@/lib/use-dark-mode";
import { SearchCommand } from "./-wiki/search-command";
import { Sidebar } from "./-wiki/sidebar";
import { TopBar } from "./-wiki/top-bar";
import { WikiProvider } from "./-wiki/wiki-context";

export const Route = createFileRoute("/wiki/$wikiId")({
  component: WikiLayout,
  loader: ({ params }) =>
    params.wikiId === "mock" ? richCliWiki : getWikiRequest(params.wikiId),
});

function WikiLayout() {
  const wiki = Route.useLoaderData();
  const { isDark, toggle } = useDarkMode();
  const [isSearchOpen, setSearchOpen] = useState(false);

  // params from /wiki/$wikiId/$slug route — undefined when on the index route.
  const childParams = useParams({ strict: false }) as {
    wikiId?: string;
    slug?: string;
  };
  const activeSlug = childParams.slug ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <WikiProvider
      wiki={wiki}
      wikiId={childParams.wikiId ?? "mock"}
      isSearchOpen={isSearchOpen}
      setSearchOpen={setSearchOpen}
    >
      <div className="min-h-screen bg-bg text-fg">
        <TopBar isDark={isDark} onToggleDark={toggle} />
        <div className="flex items-start">
          <Sidebar activeSlug={activeSlug} />
          <main className="flex min-w-0 flex-1 justify-center">
            <div className="w-full max-w-220 px-14 py-13">
              <Outlet />
            </div>
          </main>
        </div>
        <SearchCommand />
      </div>
    </WikiProvider>
  );
}
