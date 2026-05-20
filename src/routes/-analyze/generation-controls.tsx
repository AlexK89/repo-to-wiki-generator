type Props = {
  isPaused: boolean;
  onPause: () => void;
  onSkip: () => void;
};

export function GenerationControls({ isPaused, onPause, onSkip }: Props) {
  return (
    <div className="flex justify-center gap-2 border-t border-border bg-bg-elev px-5 py-3">
      <button type="button" onClick={onPause} className={controlBtn}>
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button type="button" onClick={onSkip} className={controlBtn}>
        Skip to wiki →
      </button>
    </div>
  );
}

const controlBtn =
  "rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg";
