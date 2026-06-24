export interface SeoCheck {
  id: string
  label: string
  status: 'good' | 'warn' | 'bad'
  weight: number
}

export interface SeoAnalysis {
  score: number
  checks: SeoCheck[]
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export function analyzeSeo(params: {
  title: string
  description: string
  content: string
  seoTitle?: string
  metaDescription?: string
  focusKeyword?: string
  slug?: string
}): SeoAnalysis {
  const {
    title,
    description,
    content,
    seoTitle,
    metaDescription,
    focusKeyword,
    slug,
  } = params

  const checks: SeoCheck[] = []

  // ── Title checks ────────────────────────────────────────────────────────────
  const effectiveTitle = seoTitle || title
  const titleLen = effectiveTitle.length

  checks.push({
    id: 'title-length',
    label: titleLen === 0
      ? 'Title is missing'
      : titleLen < 30
      ? `Title too short (${titleLen} chars, aim for 50–60)`
      : titleLen > 70
      ? `Title too long (${titleLen} chars, aim for 50–60)`
      : `Title length is good (${titleLen} chars)`,
    status: titleLen >= 30 && titleLen <= 70 ? 'good' : titleLen === 0 ? 'bad' : 'warn',
    weight: 15,
  })

  // ── Meta description checks ──────────────────────────────────────────────────
  const effectiveMeta = metaDescription || description
  const metaLen = effectiveMeta.length

  checks.push({
    id: 'meta-desc',
    label: metaLen === 0
      ? 'Meta description is missing'
      : metaLen < 80
      ? `Meta description too short (${metaLen} chars, aim for 120–160)`
      : metaLen > 175
      ? `Meta description too long (${metaLen} chars, trim to 160)`
      : `Meta description length is good (${metaLen} chars)`,
    status: metaLen >= 80 && metaLen <= 175 ? 'good' : metaLen === 0 ? 'bad' : 'warn',
    weight: 15,
  })

  // ── Focus keyword checks ─────────────────────────────────────────────────────
  if (!focusKeyword) {
    checks.push({ id: 'kw-set', label: 'Focus keyword not set', status: 'warn', weight: 10 })
  } else {
    const kw = focusKeyword.toLowerCase()

    checks.push({
      id: 'kw-title',
      label: effectiveTitle.toLowerCase().includes(kw)
        ? 'Focus keyword found in title'
        : 'Focus keyword missing from title',
      status: effectiveTitle.toLowerCase().includes(kw) ? 'good' : 'bad',
      weight: 15,
    })

    checks.push({
      id: 'kw-meta',
      label: effectiveMeta.toLowerCase().includes(kw)
        ? 'Focus keyword found in description'
        : 'Focus keyword missing from description',
      status: effectiveMeta.toLowerCase().includes(kw) ? 'good' : 'warn',
      weight: 10,
    })

    checks.push({
      id: 'kw-content',
      label: content.toLowerCase().includes(kw)
        ? 'Focus keyword found in content'
        : 'Focus keyword missing from content',
      status: content.toLowerCase().includes(kw) ? 'good' : 'warn',
      weight: 10,
    })
  }

  // ── Slug check ───────────────────────────────────────────────────────────────
  checks.push({
    id: 'slug',
    label: !slug
      ? 'URL slug is missing'
      : /[A-Z\s_]/.test(slug)
      ? 'URL slug should be lowercase with hyphens'
      : 'URL slug is clean',
    status: !slug ? 'bad' : /[A-Z\s_]/.test(slug) ? 'warn' : 'good',
    weight: 10,
  })

  // ── Content length check ──────────────────────────────────────────────────────
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  checks.push({
    id: 'content-length',
    label: wordCount < 100
      ? `Content too short (${wordCount} words, aim for 300+)`
      : wordCount < 300
      ? `Content could be longer (${wordCount} words)`
      : `Content length is good (${wordCount} words)`,
    status: wordCount >= 300 ? 'good' : wordCount >= 100 ? 'warn' : 'bad',
    weight: 15,
  })

  // ── Image alt check (heuristic) ───────────────────────────────────────────────
  checks.push({
    id: 'image',
    label: content.includes('![')
      ? 'Images detected in content'
      : 'Consider adding images to enrich content',
    status: content.includes('![') ? 'good' : 'warn',
    weight: 5,
  })

  // ── Score calculation ─────────────────────────────────────────────────────────
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0)
  const earnedWeight = checks.reduce((s, c) => {
    if (c.status === 'good') return s + c.weight
    if (c.status === 'warn') return s + c.weight * 0.5
    return s
  }, 0)
  const score = Math.round((earnedWeight / totalWeight) * 100)

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 85 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F'

  return { score, checks, grade }
}
