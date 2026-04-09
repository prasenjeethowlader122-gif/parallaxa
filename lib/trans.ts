// lib/translate.ts
import { unstable_cache } from 'next/cache'

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

async function _translate(text: string, targetLang: string): Promise<string> {
  if (!text?.trim()) return text
  if (targetLang === 'en') return text  // skip if already English

  const res = await fetch(
    `${GOOGLE_TRANSLATE_URL}?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: 'text',   // use 'html' if translating HTML content
      }),
    }
  )

  if (!res.ok) {
    console.error('Translation failed:', await res.text())
    return text  // fallback to original on error
  }

  const data = await res.json()
  return data.data.translations[0].translatedText
}

// Cached version — same text+lang combo won't hit API again for 24h
export const translate = unstable_cache(
  _translate,
  ['google-translate'],
  { revalidate: 86400 }
)

// Translate multiple strings in one API call (cheaper & faster)
async function _translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === 'en') return texts

  const res = await fetch(
    `${GOOGLE_TRANSLATE_URL}?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        target: targetLang,
        format: 'text',
      }),
    }
  )

  if (!res.ok) return texts

  const data = await res.json()
  return data.data.translations.map((t: any) => t.translatedText)
}

export const translateBatch = unstable_cache(
  _translateBatch,
  ['google-translate-batch'],
  { revalidate: 86400 }
)