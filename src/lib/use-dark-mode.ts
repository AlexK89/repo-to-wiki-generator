import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cubic-theme";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "dark") return true;
  if (stored === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(readInitial);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((d) => !d), []);

  return { isDark, setIsDark, toggle };
}
