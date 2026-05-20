export function LandingHero() {
  return (
    <>
      <h1 className="mb-5 text-6xl font-semibold leading-none tracking-tighter text-fg">
        Documentation that explains what
        <br />
        <span className="font-serif font-normal italic text-accent">
          your software actually does.
        </span>
      </h1>
      <p className="mx-auto mb-10 max-w-prose text-lg leading-relaxed text-fg-muted">
        Paste any public GitHub repo. cubic reads the code, identifies the user-facing features, and
        writes a wiki engineers actually want to use — with every claim cited back to the source.
      </p>
    </>
  );
}
