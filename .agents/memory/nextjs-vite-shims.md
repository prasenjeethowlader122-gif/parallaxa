---
name: Next.js to Vite migration shims
description: Key shim patterns when migrating a Next.js app to Vite + wouter + Express
---

## useSearchParams shim
Return `URLSearchParams` directly (not a tuple). Components call `.get('q')` directly.
```ts
export function useSearchParams() { return new URLSearchParams(window.location.search) }
```

## useParams shim
Export a wrapper around wouter's useParams. The recursive self-call bug (`export function useParams() { return useParams() }`) causes infinite stack overflow — always alias the wouter import.
```ts
import { useParams as useWouterParams } from 'wouter'
export function useParams<T extends Record<string, string>>() { return useWouterParams<T>() }
```

## useSession
JWT in localStorage — `cachedToken` initialized at module level is fine for client-only Vite (no SSR).

**Why:** Next.js shims need careful handling — `useSearchParams` was used both as tuple (destructuring) and as object (.get()), so returning URLSearchParams directly satisfies both call sites.

**How to apply:** Whenever migrating a Next.js app with these hooks, check all call sites before deciding the return type.
