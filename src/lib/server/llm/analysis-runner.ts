export type AnalysisGenericGuardResult = {
  offendingSubsystems: string[];
  hasGenericSubsystems: boolean;
};

type GuardableSubsystem = { id: string; title: string };

const GENERIC_SUBSYSTEM_PATTERNS = [
  /\bfrontend\b/i,
  /\bbackend\b/i,
  /\bcomponents?\b/i,
  /\butils?\b/i,
  /\bhelpers?\b/i,
  /\bapi layer\b/i,
  /\bdatabase layer\b/i,
  /\bservices?\b/i,
  /\bmodels?\b/i,
];

const isGenericSubsystemName = (value: string) =>
  GENERIC_SUBSYSTEM_PATTERNS.some((pattern) => pattern.test(value));

export const buildGenericRepairPrompt = (
  prompt: string,
  guardResult: AnalysisGenericGuardResult,
) =>
  [
    "Your previous subsystem names were too implementation-layer-oriented.",
    `Rejected subsystem names: ${guardResult.offendingSubsystems.join(", ")}`,
    "Rewrite the analysis around user-facing behaviours and features.",
    "Do not use names such as Frontend, Backend, Components, Utils, API layer, Database layer, Services, or Models.",
    "",
    prompt,
  ].join("\n");

export const detectGenericSubsystems = (input: {
  subsystems: GuardableSubsystem[];
}): AnalysisGenericGuardResult => {
  const offendingSubsystems = input.subsystems
    .filter(
      (subsystem) =>
        isGenericSubsystemName(subsystem.title) ||
        isGenericSubsystemName(subsystem.id),
    )
    .map((subsystem) => subsystem.title);

  return {
    offendingSubsystems,
    hasGenericSubsystems: offendingSubsystems.length > 0,
  };
};
