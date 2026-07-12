
import { sql } from './index';

export interface HomeSection {
  id: number;
  title: string;
  type: 'latest' | 'category' | 'featured' | 'trending';
  category_id?: number | null;
  layout: 'grid' | 'list' | 'slider';
  limit_count: number;
  order_index: number;
  is_active: boolean;
}

export async function getHomeSections() {
  return await sql`
    SELECT * FROM home_sections
    WHERE is_active = true
    ORDER BY order_index ASC
  ` as HomeSection[];
}

export async function getAllHomeSections() {
  return await sql`
    SELECT * FROM home_sections
    ORDER BY order_index ASC
  ` as HomeSection[];
}

export async function createHomeSection(section: Omit<HomeSection, 'id'>) {
  const category_id = section.category_id !== undefined ? section.category_id : null;
  return await sql`
    INSERT INTO home_sections (title, type, category_id, layout, limit_count, order_index, is_active)
    VALUES (${section.title}, ${section.type}, ${category_id}, ${section.layout}, ${section.limit_count}, ${section.order_index}, ${section.is_active})
    RETURNING *
  `;
}

export async function updateHomeSection(id: number, section: Partial<HomeSection>) {
  const category_id = section.category_id !== undefined ? section.category_id : null;
  return await sql`
    UPDATE home_sections
    SET
      title = COALESCE(${section.title}, title),
      type = COALESCE(${section.type}, type),
      category_id = ${category_id},
      layout = COALESCE(${section.layout}, layout),
      limit_count = COALESCE(${section.limit_count}, limit_count),
      order_index = COALESCE(${section.order_index}, order_index),
      is_active = COALESCE(${section.is_active}, is_active)
    WHERE id = ${id}
    RETURNING *
  `;
}

export async function deleteHomeSection(id: number) {
  return await sql`DELETE FROM home_sections WHERE id = ${id}`;
}

export async function reorderHomeSections(ids: number[]) {
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE home_sections SET order_index = ${i} WHERE id = ${ids[i]}`;
  }
}
