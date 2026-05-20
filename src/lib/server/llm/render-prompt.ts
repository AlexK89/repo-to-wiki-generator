export type PromptValues = Record<string, string>;

const toPlaceholder = (key: string) => `{{${key}}}`;

export const renderPrompt = (template: string, values: PromptValues) =>
  Object.entries(values).reduce(
    (renderedPrompt, [key, value]) =>
      renderedPrompt.split(toPlaceholder(key)).join(value),
    template,
  );

export const renderJsonPromptValue = (value: unknown) =>
  JSON.stringify(value, null, 2);
