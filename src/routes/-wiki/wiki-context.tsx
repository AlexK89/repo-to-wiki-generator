import { createContext, useContext } from "react";

import type { Wiki } from "@/types/wiki";

type WikiContextValue = {
  wiki: Wiki;
  wikiId: string;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const WikiContext = createContext<WikiContextValue | null>(null);

type ProviderProps = WikiContextValue & {
  children: React.ReactNode;
};

export function WikiProvider({ children, ...value }: ProviderProps) {
  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>;
}

export function useWiki() {
  const ctx = useContext(WikiContext);
  if (!ctx) throw new Error("useWiki must be used inside <WikiProvider>");
  return ctx;
}
