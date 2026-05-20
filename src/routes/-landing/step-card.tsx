import type { ReactNode } from "react";

type Props = {
  num: string;
  title: string;
  children: ReactNode;
};

export function StepCard({ num, title, children }: Props) {
  return (
    <div>
      <div className="mb-3 font-mono text-xs tracking-wider text-accent">{num}</div>
      <div className="mb-1.5 text-base font-semibold text-fg">{title}</div>
      <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}
