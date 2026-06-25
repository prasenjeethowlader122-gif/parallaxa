import { sql } from './index'

export interface BlockParam {
  name: string
  label: string
  placeholder?: string
  defaultValue?: string
}

export interface CustomBlock {
  id: number
  name: string
  label: string
  description: string
  icon: string
  params: BlockParam[]
  htmlTemplate: string
  isBuiltin: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateCustomBlockInput {
  name: string
  label: string
  description?: string
  icon?: string
  params?: BlockParam[]
  htmlTemplate: string
}

export interface UpdateCustomBlockInput {
  label?: string
  description?: string
  icon?: string
  params?: BlockParam[]
  htmlTemplate?: string
}

function mapRow(row: Record<string, unknown>): CustomBlock {
  return {
    id: row.id as number,
    name: row.name as string,
    label: row.label as string,
    description: (row.description as string) ?? '',
    icon: (row.icon as string) ?? '🧩',
    params: (row.params as BlockParam[]) ?? [],
    htmlTemplate: (row.html_template as string) ?? '',
    isBuiltin: (row.is_builtin as boolean) ?? false,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getAllCustomBlocks(): Promise<CustomBlock[]> {
  const rows = await sql`
    SELECT * FROM custom_blocks ORDER BY is_builtin DESC, created_at ASC
  `
  return rows.map(mapRow)
}

export async function getUserCustomBlocks(): Promise<CustomBlock[]> {
  const rows = await sql`
    SELECT * FROM custom_blocks WHERE is_builtin = FALSE ORDER BY created_at DESC
  `
  return rows.map(mapRow)
}

export async function getCustomBlockByName(name: string): Promise<CustomBlock | null> {
  const rows = await sql`
    SELECT * FROM custom_blocks WHERE name = ${name} LIMIT 1
  `
  return rows[0] ? mapRow(rows[0]) : null
}

export async function createCustomBlock(input: CreateCustomBlockInput): Promise<CustomBlock> {
  const params = JSON.stringify(input.params ?? [])
  const rows = await sql`
    INSERT INTO custom_blocks (name, label, description, icon, params, html_template, is_builtin)
    VALUES (
      ${input.name},
      ${input.label},
      ${input.description ?? ''},
      ${input.icon ?? '🧩'},
      ${params}::jsonb,
      ${input.htmlTemplate},
      FALSE
    )
    RETURNING *
  `
  return mapRow(rows[0])
}

export async function updateCustomBlock(id: number, input: UpdateCustomBlockInput): Promise<CustomBlock> {
  const sets: string[] = []
  const values: Record<string, unknown> = {}

  if (input.label !== undefined) values.label = input.label
  if (input.description !== undefined) values.description = input.description
  if (input.icon !== undefined) values.icon = input.icon
  if (input.params !== undefined) values.params = JSON.stringify(input.params)
  if (input.htmlTemplate !== undefined) values.html_template = input.htmlTemplate

  const rows = await sql`
    UPDATE custom_blocks
    SET
      label       = COALESCE(${input.label ?? null}, label),
      description = COALESCE(${input.description ?? null}, description),
      icon        = COALESCE(${input.icon ?? null}, icon),
      params      = COALESCE(${input.params ? JSON.stringify(input.params) : null}::jsonb, params),
      html_template = COALESCE(${input.htmlTemplate ?? null}, html_template),
      updated_at  = NOW()
    WHERE id = ${id} AND is_builtin = FALSE
    RETURNING *
  `
  if (!rows[0]) throw new Error('Block not found or is a built-in block')
  return mapRow(rows[0])
}

export async function deleteCustomBlock(id: number): Promise<void> {
  const rows = await sql`
    DELETE FROM custom_blocks WHERE id = ${id} AND is_builtin = FALSE RETURNING id
  `
  if (!rows[0]) throw new Error('Block not found or is a built-in block')
}
