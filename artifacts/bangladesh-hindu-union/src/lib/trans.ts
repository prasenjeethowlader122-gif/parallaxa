export async function translateBatch(texts: string[], locale: string): Promise<string[]> {
  if (locale === 'en') return texts
  // Translation disabled in frontend - would require API call
  return texts
}
