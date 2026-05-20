import { useState, type SubmitEvent } from "react";
import { ArrowRight } from "lucide-react";

import { GithubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (url: string) => void;
};

export function RepoInput({ onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = (e?: SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) return;

    onSubmit(trimmed);
  };

  const enabled = url.trim().length > 0;

  return (
    <form onSubmit={submit} className="relative mx-auto mb-3 max-w-150">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl bg-bg-elev py-1.5 pl-4 pr-1.5 shadow-sm transition-all",
          focused
            ? "border-2 border-accent shadow-md"
            : "border-2 border-border-strong",
        )}
        style={
          focused
            ? {
                boxShadow:
                  "0 0 0 4px color-mix(in oklch, var(--accent) 12%, transparent), var(--shadow-md)",
              }
            : undefined
        }
      >
        <GithubIcon size={20} className="opacity-50" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="github.com/owner/repo"
          autoFocus
          aria-label="GitHub repository URL"
          className="flex-1 border-0 bg-transparent py-3 font-sans text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        <button
          type="submit"
          disabled={!enabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border-0 px-4 py-2.5 text-sm font-medium transition-all",
            enabled
              ? "cursor-pointer bg-fg text-bg"
              : "cursor-not-allowed bg-border text-fg-subtle",
          )}
        >
          Generate wiki
          <ArrowRight size={13} />
        </button>
      </div>
      <p className="mt-2.5 text-xs text-fg-subtle">
        Free · no signup · works on any public repo · usually under 60 seconds
      </p>
    </form>
  );
}
