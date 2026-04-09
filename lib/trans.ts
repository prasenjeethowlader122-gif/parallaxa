import { unstable_cache } from 'next/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI('AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: { responseMimeType: "application/json" } // Ensures clean data extraction
});

/**
 * Internal single translation logic
 */
async function _translate(text: string, targetLang: string): Promise<string> {
  if (!text?.trim()) return text;
  if (targetLang === 'en') return text;

  try {
    const prompt = `Translate the following text into the language with code "${targetLang}". 
    Return only the translation in a JSON object: {"translatedText": "..."}
    Text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());
    
    return response.translatedText || text;
  } catch (error) {
    console.error('Gemini Translation failed:', error);
    return text; // Fallback to original
  }
}

/**
 * Internal batch translation logic
 */
async function _translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === 'en' || !texts.length) return texts;

  try {
    const prompt = `Translate this list of strings into the language code "${targetLang}". 
    Maintain the exact order. Return a JSON object with a "translations" array.
    Strings: ${JSON.stringify(texts)}`;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());
    
    return response.translations || texts;
  } catch (error) {
    console.error('Gemini Batch Translation failed:', error);
    return texts;
  }
}

// Cached version — same text+lang combo won't hit API again for 24h
export const translate = unstable_cache(
  _translate,
  ['gemini-translate'],
  { revalidate: 86400 }
);

export const translateBatch = unstable_cache(
  _translateBatch,
  ['gemini-translate-batch'],
  { revalidate: 86400 }
);