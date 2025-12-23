export function showFeatureNotImplemented(featureName: string, suggestedEndpoint?: string) {
  let message = `Функционал "${featureName}" находится в разработке.`;
  if (suggestedEndpoint) {
    message += `\n\nПредполагаемый эндпоинт: ${suggestedEndpoint}`;
  }
  console.warn(message);
}
