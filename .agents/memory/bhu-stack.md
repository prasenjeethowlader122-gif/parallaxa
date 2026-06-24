---
name: Bangladesh Hindu Union stack
description: Architecture decisions specific to this project
---

## Raw pool queries in API
Articles routes use `import { pool } from "@workspace/db"` with raw SQL. Dynamic imports (`await import(...)`) cause double-execution bugs — always use static imports.

## Category filter
Category query uses `ILIKE` (case-insensitive) since frontend slugs are lowercase but DB stores e.g. "Home".

## Inngest stubbed
`artifacts/bangladesh-hindu-union/src/lib/inngest/` files export null/empty — Inngest is server-only and not available in Vite frontend.

## DB schema
`articles` and `users` tables created via raw SQL migrations (not Drizzle push). `lib/db/src/schema/index.ts` exports empty stubs. If schema changes are needed, run raw SQL against the DB directly.

**Why:** Schema was imported from the original Next.js app before Drizzle was adopted.
