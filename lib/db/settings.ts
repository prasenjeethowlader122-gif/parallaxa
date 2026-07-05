import { sql } from './index'

export interface SystemSettings {
  ai_model: string
  ai_api_key: string
  ai_system_prompt: string
  ai_max_tokens: number
  ai_temperature: number
  fb_access_token: string
  fb_page_id: string
  fb_thumbnail_template: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  ai_model: 'gemini-3.1-flash-lite-preview',
  ai_api_key: '',
  ai_system_prompt: `You are a professional news journalist for Only Hindu.
Write a full news article based ONLY on the provided source material.
Respond with ONLY a valid JSON object — no markdown fences, no preamble:
{"title":"<headline>","description":"<2-sentence summary>","content":"<4-5 paragraph body , must be markdown format , Analysis and highlight any important keyword>","category":"<Business|Technology|Sports|Entertainment|Science|Health|World>"}`,
  ai_max_tokens: 2500,
  ai_temperature: 0.6,
  fb_access_token: '',
  fb_page_id: '',
  fb_thumbnail_template: 'default',
}

export async function ensureSettingsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
  } catch (e) {
    console.error('ensureSettingsTable failed:', e)
  }
}

export async function getSettings(): Promise<SystemSettings> {
  try {
    await ensureSettingsTable()
    const rows = await sql`SELECT * FROM settings`
    const settings = { ...DEFAULT_SETTINGS }

    if (rows && rows.length > 0) {
      rows.forEach((row: any) => {
        const key = row.key as keyof SystemSettings
        if (key in settings) {
          if (typeof DEFAULT_SETTINGS[key] === 'number') {
            (settings as any)[key] = Number(row.value)
          } else {
            (settings as any)[key] = row.value
          }
        }
      })
    }

    return settings
  } catch (e) {
    console.error('getSettings failed:', e)
    return DEFAULT_SETTINGS
  }
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<void> {
  try {
    await ensureSettingsTable()
    for (const [key, value] of Object.entries(settings)) {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `
    }
  } catch (e) {
    console.error('updateSettings failed:', e)
    throw e
  }
}
