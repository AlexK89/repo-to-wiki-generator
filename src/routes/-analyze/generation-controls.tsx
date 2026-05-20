type Props = {
  isPaused: boolean;
  canSkip?: boolean;
  onPause: () => void;
  onSkip: () => void;
};

export function GenerationControls({
  isPaused,
  canSkip = true,
  onPause,
  onSkip,
}: Props) {
  return (
    <div className="flex justify-center gap-2 border-t border-border bg-bg-elev px-5 py-3">
      <button type="button" onClick={onPause} className={controlBtn}>
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        disabled={!canSkip}
        onClick={onSkip}
        className={controlBtn}
      >
        Skip to wiki →
      </button>
    </div>
  );
}

const controlBtn =
  "rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-fg-muted";
