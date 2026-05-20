import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { startAnalyzeJobRequest } from "@/lib/client/api";
import { useDarkMode } from "@/lib/use-dark-mode";
import { HowItWorks } from "./-landing/how-it-works";
import { LandingFooter } from "./-landing/landing-footer";
import { LandingHeader } from "./-landing/landing-header";
import { LandingHero } from "./-landing/landing-hero";
import { RepoInput } from "./-landing/repo-input";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (url: string) => {
    setError(null);
    setSubmitting(true);

    try {
      const job = await startAnalyzeJobRequest(url);
      navigate({ to: "/analyze/$jobId", params: { jobId: job.id } });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not start the analysis job.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0"
      />

      <LandingHeader isDark={isDark} onToggleDark={toggle} />

      <main className="relative mx-auto max-w-220 px-8 pb-20 pt-15 text-center">
        <LandingHero />
        <RepoInput
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
        <HowItWorks />
      </main>

      <LandingFooter />
    </div>
  );
}
