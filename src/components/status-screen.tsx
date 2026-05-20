import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";

import { CubicLogo } from "@/components/cubic-logo";
import { cn } from "@/lib/utils";

type Variant = "loading" | "error" | "not-found";

type Props = {
  variant: Variant;
  title: string;
  description?: string;
  detail?: string;
  showHomeLink?: boolean;
};

export function StatusScreen({
  variant,
  title,
  description,
  detail,
  showHomeLink = true,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center px-8 pt-7">
        <Link to="/" className="flex items-center gap-2 text-fg">
          <CubicLogo />
          <span className="text-sm font-semibold tracking-tight">cubic</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-8">
        <div className="fade-in flex max-w-120 flex-col items-center text-center">
          <StatusIcon variant={variant} />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-100 text-base leading-relaxed text-fg-muted">
              {description}
            </p>
          ) : null}
          {detail ? (
            <pre className="surface-card mt-5 max-w-full overflow-auto rounded-lg px-4 py-3 text-left font-mono text-xs leading-relaxed text-fg-muted">
              {detail}
            </pre>
          ) : null}
          {showHomeLink ? (
            <Link
              to="/"
              className="mt-7 inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-elev px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg-subtle"
            >
              <ArrowLeft size={14} />
              Back to home
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

type IconProps = { variant: Variant };

function StatusIcon({ variant }: IconProps) {
  if (variant === "loading") {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  const isError = variant === "error";
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold",
        isError
          ? "bg-red-500/10 text-red-600"
          : "bg-bg-subtle text-fg-subtle",
      )}
    >
      {isError ? "!" : "?"}
    </div>
  );
}
