import { cn } from "@/lib/utils";
import { GithubIcon } from "@/components/icons/github-icon";

type Props = {
  repoUrl: string;
  sha: string;
  isCentered?: boolean;
};

export function RepoLine({ repoUrl, sha, isCentered }: Props) {
  const stripped = repoUrl.replace(/^https?:\/\//, "");
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-xs tracking-wide text-fg-subtle",
        isCentered ? "justify-center" : "justify-start",
      )}
    >
      <GithubIcon size={11} />
      <span className="overflow-hidden text-ellipsis">{stripped}</span>
      <span className="shrink-0 rounded border border-border bg-bg-subtle px-1.5 py-px text-fg-subtle">
        @{sha}
      </span>
    </div>
  );
}
