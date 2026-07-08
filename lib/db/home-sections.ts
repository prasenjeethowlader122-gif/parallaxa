import { sql } from './index'

export type SectionType = 'featured' | 'horizontal' | 'grid' | 'breaking' | 'trending'

export interface HomeSection {
  id: number
  title: string
  type: SectionType
  category: string | null
  limit: number
  orderIndex: number
  isActive: boolean
}

export async function ensureHomeSectionsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        "limit" INTEGER DEFAULT 6,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Seed default sections if empty
    const count = await sql`SELECT COUNT(*) FROM home_sections`
    if (parseInt(count[0].count as string) === 0) {
      await sql`
        INSERT INTO home_sections (title, type, category, "limit", order_index)
        VALUES
          ('Top Stories', 'featured', NULL, 6, 0),
          ('World', 'horizontal', 'World', 6, 1),
          ('Tech', 'horizontal', 'Technology', 6, 2)
      `
    }
  } catch (e) {
    console.error('ensureHomeSectionsTable failed:', e)
  }
}

export async function getHomeSections(): Promise<HomeSection[]> {
  try {
    await ensureHomeSectionsTable()
    const rows = await sql`
      SELECT * FROM home_sections
      WHERE is_active = TRUE
      ORDER BY order_index ASC
    `
    return rows.map(row => ({
      id: row.id as number,
      title: row.title as string,
      type: row.type as SectionType,
      category: row.category as string | null,
      limit: row.limit as number,
      orderIndex: row.order_index as number,
      isActive: row.is_active as boolean
    }))
  } catch (e) {
    console.error('getHomeSections failed:', e)
    return []
  }
}

export async function getAllHomeSections(): Promise<HomeSection[]> {
  try {
    await ensureHomeSectionsTable()
    const rows = await sql`
      SELECT * FROM home_sections
      ORDER BY order_index ASC
    `
    return rows.map(row => ({
      id: row.id as number,
      title: row.title as string,
      type: row.type as SectionType,
      category: row.category as string | null,
      limit: row.limit as number,
      orderIndex: row.order_index as number,
      isActive: row.is_active as boolean
    }))
  } catch (e) {
    console.error('getAllHomeSections failed:', e)
    return []
  }
}

export async function createHomeSection(section: Omit<HomeSection, 'id'>): Promise<HomeSection> {
  try {
    await ensureHomeSectionsTable()
    const rows = await sql`
      INSERT INTO home_sections (title, type, category, "limit", order_index, is_active)
      VALUES (${section.title}, ${section.type}, ${section.category}, ${section.limit}, ${section.orderIndex}, ${section.isActive})
      RETURNING *
    `
    const row = rows[0]
    return {
      id: row.id as number,
      title: row.title as string,
      type: row.type as SectionType,
      category: row.category as string | null,
      limit: row.limit as number,
      orderIndex: row.order_index as number,
      isActive: row.is_active as boolean
    }
  } catch (e) {
    console.error('createHomeSection failed:', e)
    throw e
  }
}

export async function updateHomeSection(id: number, section: Partial<HomeSection>): Promise<void> {
  try {
    await ensureHomeSectionsTable()
    await sql`
      UPDATE home_sections
      SET
        title = COALESCE(${section.title ?? null}, title),
        type = COALESCE(${section.type ?? null}, type),
        category = COALESCE(${section.category ?? null}, category),
        "limit" = COALESCE(${section.limit ?? null}, "limit"),
        order_index = COALESCE(${section.orderIndex ?? null}, order_index),
        is_active = COALESCE(${section.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
    `
  } catch (e) {
    console.error('updateHomeSection failed:', e)
    throw e
  }
}

export async function deleteHomeSection(id: number): Promise<void> {
  try {
    await sql`DELETE FROM home_sections WHERE id = ${id}`
  } catch (e) {
    console.error('deleteHomeSection failed:', e)
    throw e
  }
}

export async function updateHomeSectionsOrder(orders: { id: number, orderIndex: number }[]): Promise<void> {
  try {
    for (const item of orders) {
      await sql`
        UPDATE home_sections
        SET order_index = ${item.orderIndex}, updated_at = NOW()
        WHERE id = ${item.id}
      `
    }
  } catch (e) {
    console.error('updateHomeSectionsOrder failed:', e)
    throw e
  }
}
