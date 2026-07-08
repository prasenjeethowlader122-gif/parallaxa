import { blockRegistry, parseBlockParams } from './block-registry'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CUSTOM MDX BLOCKS - Unified & New Blocks
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UNIFIED EMBED BLOCK (Social Media & Video)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'embed',
  label: 'Social Embed',
  icon: 'share',
  pattern: /\[!embed\s*\(\s*url\s*=\s*["']?(.+?)["']?\s*\)\s*\]/,
  template: '[!embed(url="")]',
  handler: (match) => {
    const url = (match[1] || '').trim()
    let htmlContent = ''
    let type = 'generic-embed'

    if (url.includes('facebook.com')) {
      type = 'fbpost'
      htmlContent = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="700" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`
    }
    else if (url.includes('twitter.com') || url.includes('x.com')) {
      type = 'tweet'
      htmlContent = `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`
    }
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      type = 'youtube'
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
      const videoId = videoIdMatch ? videoIdMatch[1] : ''
      htmlContent = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    }
    else if (url.includes('tiktok.com')) {
      type = 'tiktok'
      htmlContent = `<blockquote class="tiktok-embed" cite="${url}" data-unique-id="0" style="max-width: 500px;"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`
    }
    else if (url.includes('instagram.com')) {
      type = 'instagram'
      htmlContent = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><section></section></blockquote><script async src="//www.instagram.com/embed.js"></script>`
    }
    else if (url.includes('reddit.com')) {
      type = 'reddit'
      htmlContent = `<blockquote class="reddit-embed" data-embed-height="500"><a href="${url}">Post</a></blockquote><script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`
    }
    else if (url.includes('vimeo.com')) {
      type = 'vimeo'
      const videoIdMatch = url.match(/vimeo\.com\/(\d+)/)
      const videoId = videoIdMatch ? videoIdMatch[1] : ''
      htmlContent = `<iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="400" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
    }
    else if (url.includes('codepen.io')) {
      type = 'codepen'
      htmlContent = `<iframe height="400" style="width: 100%;" scrolling="no" title="Pen" src="${url}" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true"></iframe>`
    }
    else if (url.includes('gist.github.com')) {
      type = 'gist'
      htmlContent = `<script src="${url}.js"></script>`
    }

    return {
      type: 'embed',
      hName: 'embed',
      hProperties: {
        className: `custom-block ${type}-embed`,
        dataUrl: url,
        htmlContent: htmlContent || `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GOAL BLOCK (Progress with Goal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'goal',
  label: 'Goal',
  icon: 'trending_up',
  pattern: /\[!goal\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!goal(title="Current Progress" current="50" total="100" unit="%")]',
  handler: (match) => {
    const rawParams = match[1] || ''
    const params: Record<string, string> = {}
    const re = /(\w+)\s*=\s*(?:["']([^"']*)["']|(\S+))/g
    let m
    while ((m = re.exec(rawParams)) !== null) {
      params[m[1]] = m[2] ?? m[3] ?? ''
    }

    return {
      type: 'goal',
      hName: 'goal',
      hProperties: {
        className: 'custom-block goal-block',
        title: params.title || 'Goal Progress',
        current: params.current || '0',
        total: params.total || '100',
        unit: params.unit || '',
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CALLOUT BLOCK (Alerts/Notes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'callout',
  label: 'Callout',
  icon: 'info',
  pattern: /\[!callout\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!callout(type="info" title="Note" message="This is a callout message.")]',
  handler: (match) => {
    const rawParams = match[1] || ''
    const params: Record<string, string> = {}
    const re = /(\w+)\s*=\s*(?:["']([^"']*)["']|(\S+))/g
    let m
    while ((m = re.exec(rawParams)) !== null) {
      params[m[1]] = m[2] ?? m[3] ?? ''
    }

    return {
      type: 'callout',
      hName: 'callout',
      hProperties: {
        className: `custom-block callout-block callout-${params.type || 'info'}`,
        type: params.type || 'info',
        title: params.title || '',
        message: params.message || '',
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BUTTON BLOCK (CTA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'button',
  label: 'Button',
  icon: 'link',
  pattern: /\[!button\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!button(text="Click Here" url="https://" color="#1a1b1c")]',
  handler: (match) => {
    const rawParams = match[1] || ''
    const params: Record<string, string> = {}
    const re = /(\w+)\s*=\s*(?:["']([^"']*)["']|(\S+))/g
    let m
    while ((m = re.exec(rawParams)) !== null) {
      params[m[1]] = m[2] ?? m[3] ?? ''
    }

    return {
      type: 'button',
      hName: 'button',
      hProperties: {
        className: 'custom-block button-block',
        text: params.text || 'Button',
        url: params.url || '#',
        color: params.color || '#1a1b1c',
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BADGE BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'badge',
  label: 'Badge',
  icon: 'tag',
  pattern: /\[!badge\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!badge(text="New" color="blue")]',
  handler: (match) => {
    const rawParams = match[1] || ''
    const params: Record<string, string> = {}
    const re = /(\w+)\s*=\s*(?:["']([^"']*)["']|(\S+))/g
    let m
    while ((m = re.exec(rawParams)) !== null) {
      params[m[1]] = m[2] ?? m[3] ?? ''
    }

    return {
      type: 'badge',
      hName: 'badge',
      hProperties: {
        className: `custom-block badge-block badge-${params.color || 'gray'}`,
        text: params.text || '',
        color: params.color || 'gray',
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RUN CODE BLOCK (HTML/JS/Components)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'run',
  label: 'Run Code',
  icon: 'terminal',
  pattern: /\[!run\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!run()]',
  handler: (match) => {
    let code = (match[1] || '').trim()

    // Check if it's in the format code="..."
    const codeMatch = code.match(/^code=["']([\s\S]*?)["']$/)
    if (codeMatch) {
      code = codeMatch[1]
    }

    return {
      type: 'run',
      hName: 'run',
      hProperties: {
        className: 'custom-block run-code',
        htmlContent: code,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CUSTOM STYLE BLOCK (CSS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'style',
  label: 'Custom CSS',
  icon: 'palette',
  pattern: /\[!style\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!style()]',
  handler: (match) => {
    let css = (match[1] || '').trim()

    // Check if it's in the format css="..."
    const cssMatch = css.match(/^css=["']([\s\S]*?)["']$/)
    if (cssMatch) {
      css = cssMatch[1]
    }

    return {
      type: 'style',
      hName: 'style',
      hProperties: {
        className: 'custom-block custom-style',
        htmlContent: `<style>${css}</style>`,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCREENSHOT BLOCK (Social Media Screenshot)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'screenshot',
  label: 'Screenshot',
  icon: 'image',
  pattern: /\[!screenshot\s*\(\s*url\s*=\s*["']?(.+?)["']?\s*\)\s*\]/,
  template: '[!screenshot(url="")]',
  handler: (match) => {
    const url = (match[1] || '').trim()
    const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`

    return {
      type: 'screenshot',
      hName: 'screenshot',
      hProperties: {
        className: 'custom-block screenshot-block',
        dataUrl: url,
        htmlContent: `<div class="screenshot-container" style="margin: 20px 0; border: 1px solid #e4e2e1; rounded: 12px; overflow: hidden; background: #fcf8f9;">
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: block;">
            <img src="${screenshotUrl}" alt="Screenshot of ${url}" style="width: 100%; height: auto; display: block;" loading="lazy" />
          </a>
          <div style="padding: 10px 15px; font-size: 12px; color: #9e9fa0; border-top: 1px solid #e4e2e1; background: #fff;">
            Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #585f64; text-decoration: underline;">${url}</a>
          </div>
        </div>`,
      },
    }
  },
})

// Keep old blocks for backward compatibility but redirect them to the new unified handler if needed
// or just update them to the new handler signature.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INFOBOX BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'infobox',
  label: 'InfoBox',
  icon: 'info',
  pattern: /\[!infobox\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!infobox(title="Quick Facts" content="Details go here..." type="info")]',
  handler: (match) => {
    const params = parseBlockParams(match[1] || '')
    return {
      type: 'infobox',
      hName: 'infobox',
      hProperties: {
        className: `custom-block infobox-block infobox-${params.type || 'info'}`,
        ...params,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  REFERENCE BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'reference',
  label: 'Reference',
  icon: 'book',
  pattern: /\[!reference\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!reference(text="Source Title" url="https://" author="Author Name" year="2024")]',
  handler: (match) => {
    const params = parseBlockParams(match[1] || '')
    return {
      type: 'reference',
      hName: 'reference',
      hProperties: {
        className: 'custom-block reference-block',
        ...params,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIKA BLOCK (Notes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'tika',
  label: 'Tika (Note)',
  icon: 'sticky_note_2',
  pattern: /\[!tika\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!tika(text="এখানে আপনার টিকা লিখুন...")]',
  handler: (match) => {
    const params = parseBlockParams(match[1] || '')
    return {
      type: 'tika',
      hName: 'tika',
      hProperties: {
        className: 'custom-block tika-block',
        ...params,
      },
    }
  },
})
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DIAGRAM BLOCK (D3, advanced + fully accessible)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'diagram',
  label: 'Diagram',
  icon: 'schema',
  pattern: /\[!diagram\s*\(([\s\S]*?)\)\s*\]/,
  template:
    '[!diagram(title="Login flow" direction="LR" code=\'{"nodes":[{"id":"a","label":"User","type":"actor"},{"id":"b","label":"Auth service","type":"service"},{"id":"c","label":"API","type":"service"},{"id":"d","label":"Dashboard","type":"actor"}],"edges":[{"source":"a","target":"b","label":"submits credentials"},{"source":"b","target":"c","label":"issues token"},{"source":"c","target":"d","label":"redirects"}],"groups":[{"id":"g1","label":"Backend","nodes":["b","c"]}]}\')]',
  handler: (match) => {
    const rawParams = match[1] || ''
    const params = {}
    // Handles both "..." and '...' quoting so JSON containing double quotes
    // can be wrapped in single quotes without escaping hell.
    const re = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
    let m
    while ((m = re.exec(rawParams)) !== null) {
      params[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
    }

    const title = params.title || 'Diagram'
    const direction = (params.direction || 'TB').toUpperCase() // TB | LR
    const layoutMode = params.layout || 'auto' // auto | layered | force
    const diagramId = `d3diagram-${Math.random().toString(36).slice(2, 10)}`

    const escapeHtml = (s) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // ── Parse graph JSON, fail soft with an empty graph on bad input ──
    let graph = { nodes: [], edges: [], groups: [] }
    try {
      const parsed = JSON.parse(params.code || '{}')
      graph = {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      }
    } catch (e) {
      // leave graph empty; renderer shows a fallback message
    }

    const types = Array.from(new Set(graph.nodes.map(n => n.type || 'default')))
    const nodesJson = escapeHtml(JSON.stringify(graph.nodes))
    const edgesJson = escapeHtml(JSON.stringify(graph.edges))
    const groupsJson = escapeHtml(JSON.stringify(graph.groups))

    // ── Text equivalent: always rendered, drives screen reader / no-JS fallback ──
    const idToLabel = {}
    graph.nodes.forEach(n => { idToLabel[n.id] = n.label || n.id })
    const textEquivalent = `
      <table class="diagram-fallback-table" data-diagram-fallback="${diagramId}">
        <caption>${escapeHtml(title)} — ${graph.nodes.length} steps and their connections</caption>
        <thead><tr><th scope="col">Step</th><th scope="col">Type</th><th scope="col">Connects to</th></tr></thead>
        <tbody>
          ${graph.nodes.map(n => {
            const outgoing = graph.edges.filter(e => e.source === n.id)
            const targets = outgoing.map(e => {
              const label = idToLabel[e.target] || e.target
              return e.label ? `${escapeHtml(label)} (${escapeHtml(e.label)})` : escapeHtml(label)
            }).join('; ') || '—'
            return `<tr><td>${escapeHtml(n.label || n.id)}</td><td>${escapeHtml(n.type || 'default')}</td><td>${targets}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    `

    const htmlContent = `
      <div class="diagram-container" role="group" aria-label="${escapeHtml(title)}"
           style="margin:20px 0;border:1px solid var(--border,#e4e2e1);border-radius:12px;background:var(--surface-1,#fcf8f9);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border,#e4e2e1);">
          <p id="${diagramId}-desc" style="margin:0;font-size:13px;color:var(--text-secondary,#6b6b68);">
            ${escapeHtml(title)} · Tab or arrow keys to move between ${graph.nodes.length} nodes
          </p>
          <div style="display:flex;gap:6px;">
            <button type="button" data-action="zoom-out" aria-label="Zoom out" style="width:28px;height:28px;border:1px solid var(--border-strong,#999);background:var(--surface-2,#fff);border-radius:6px;cursor:pointer;">−</button>
            <button type="button" data-action="zoom-reset" aria-label="Reset zoom" style="width:28px;height:28px;border:1px solid var(--border-strong,#999);background:var(--surface-2,#fff);border-radius:6px;cursor:pointer;">⤢</button>
            <button type="button" data-action="zoom-in" aria-label="Zoom in" style="width:28px;height:28px;border:1px solid var(--border-strong,#999);background:var(--surface-2,#fff);border-radius:6px;cursor:pointer;">+</button>
          </div>
        </div>

        <div id="${diagramId}"
             data-nodes="${nodesJson}"
             data-edges="${edgesJson}"
             data-groups="${groupsJson}"
             data-title="${escapeHtml(title)}"
             data-direction="${direction}"
             data-layout="${layoutMode}"
             style="width:100%;overflow:hidden;position:relative;touch-action:none;"></div>

        ${types.length ? `<div style="display:flex;gap:14px;flex-wrap:wrap;padding:8px 14px;font-size:12px;color:var(--text-secondary,#6b6b68);border-top:1px solid var(--border,#e4e2e1);">
          ${types.map((t, i) => `<span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:3px;background:${diagramColor(i)};display:inline-block;"></span>${escapeHtml(t)}</span>`).join('')}
        </div>` : ''}

        <div id="${diagramId}-live" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);"></div>
        <details style="padding:10px 14px;">
          <summary style="cursor:pointer;font-size:12px;color:var(--text-secondary,#6b6b68);">Text version of this diagram</summary>
          ${textEquivalent}
        </details>
      </div>

      <script>
        (function () {
          function diagramColor(i) {
            var palette = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#BA7517']
            return palette[i % palette.length]
          }
          window['__diagramColor_${diagramId}'] = diagramColor

          function render() {
            if (typeof d3 === 'undefined') {
              var s = document.createElement('script')
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'
              s.onload = render
              document.head.appendChild(s)
              return
            }
            var root = document.getElementById('${diagramId}')
            if (!root) return
            var nodes = JSON.parse(root.dataset.nodes || '[]')
            var edges = JSON.parse(root.dataset.edges || '[]')
            var groups = JSON.parse(root.dataset.groups || '[]')
            var title = root.dataset.title || 'Diagram'
            var direction = root.dataset.direction || 'TB'
            var layoutMode = root.dataset.layout || 'auto'
            var liveRegion = document.getElementById('${diagramId}-live')
            if (!nodes.length) {
              root.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-secondary,#888);">No diagram data — check the diagram block\\'s code param is valid JSON.</p>'
              return
            }

            var typeList = Array.from(new Set(nodes.map(function (n) { return n.type || 'default' })))
            var colorOf = function (n) {
              return diagramColor(typeList.indexOf(n.type || 'default'))
            }

            var idToNode = {}
            nodes.forEach(function (n) { idToNode[n.id] = n })

            // Detect cycles to decide layered vs force layout
            function hasCycle() {
              var visiting = {}, visited = {}
              var adj = {}
              edges.forEach(function (e) {
                adj[e.source] = adj[e.source] || []
                adj[e.source].push(e.target)
              })
              function dfs(id) {
                if (visiting[id]) return true
                if (visited[id]) return false
                visiting[id] = true
                var next = adj[id] || []
                for (var i = 0; i < next.length; i++) {
                  if (dfs(next[i])) return true
                }
                visiting[id] = false
                visited[id] = true
                return false
              }
              return nodes.some(function (n) { return dfs(n.id) })
            }

            var useForce = layoutMode === 'force' || (layoutMode === 'auto' && hasCycle())

            var boxW = 160, boxH = 52
            var width = 720, height = 480

            if (!useForce) {
              // ── Layered DAG layout: longest-path layering + simple ordering ──
              nodes.forEach(function (n) { n.layer = 0 })
              var changed = true, guard = 0
              while (changed && guard++ < 200) {
                changed = false
                edges.forEach(function (e) {
                  var s = idToNode[e.source], t = idToNode[e.target]
                  if (s && t && t.layer <= s.layer) { t.layer = s.layer + 1; changed = true }
                })
              }
              var layerGroups = {}
              nodes.forEach(function (n) {
                layerGroups[n.layer] = layerGroups[n.layer] || []
                layerGroups[n.layer].push(n)
              })
              // barycenter ordering pass to reduce crossings
              for (var pass = 0; pass < 2; pass++) {
                Object.keys(layerGroups).forEach(function (layer) {
                  layerGroups[layer].forEach(function (n) {
                    var incoming = edges.filter(function (e) { return e.target === n.id })
                    if (incoming.length) {
                      var avg = incoming.reduce(function (sum, e) {
                        var s = idToNode[e.source]
                        return sum + (s ? layerGroups[s.layer].indexOf(s) : 0)
                      }, 0) / incoming.length
                      n._bary = avg
                    } else { n._bary = 0 }
                  })
                  layerGroups[layer].sort(function (a, b) { return (a._bary || 0) - (b._bary || 0) })
                })
              }

              var colGap = 100, rowGap = 30
              var numLayers = Object.keys(layerGroups).length
              var maxRows = Math.max.apply(null, Object.values(layerGroups).map(function (a) { return a.length }))

              if (direction === 'LR') {
                width = numLayers * boxW + (numLayers - 1) * colGap + 40
                height = maxRows * boxH + (maxRows - 1) * rowGap + 40
              } else {
                width = maxRows * boxW + (maxRows - 1) * colGap + 40
                height = numLayers * boxH + (numLayers - 1) * rowGap + 40
              }

              Object.keys(layerGroups).forEach(function (layer) {
                var group = layerGroups[layer]
                var crossW = group.length * boxW + (group.length - 1) * rowGap
                group.forEach(function (n, i) {
                  if (direction === 'LR') {
                    n.x = 20 + Number(layer) * (boxW + colGap)
                    n.y = 20 + i * (boxH + rowGap) + (height - crossW - 40) / 2
                  } else {
                    n.x = 20 + i * (boxW + rowGap) + (width - crossW - 40) / 2
                    n.y = 20 + Number(layer) * (boxH + colGap)
                  }
                })
              })
            } else {
              // ── Force layout for cyclic / non-DAG graphs ──
              width = 720; height = 460
              nodes.forEach(function (n) { n.x = width / 2 + Math.random() * 40; n.y = height / 2 + Math.random() * 40 })
            }

            var container = d3.select(root)
            var svg = container.append('svg')
              .attr('width', '100%')
              .attr('height', useForce ? height : Math.min(height, 640))
              .attr('viewBox', '0 0 ' + width + ' ' + height)
              .attr('role', 'img')
              .attr('aria-labelledby', '${diagramId}-title')
              .attr('aria-describedby', '${diagramId}-desc')

            svg.append('title').attr('id', '${diagramId}-title').text(title)

            svg.append('defs').html(
              '<marker id="${diagramId}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
              '<path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
            )

            var zoomLayer = svg.append('g').attr('class', 'zoom-layer')

            // Subgraph group boxes, drawn behind everything
            if (groups.length && !useForce) {
              groups.forEach(function (g) {
                var members = nodes.filter(function (n) { return (g.nodes || []).indexOf(n.id) !== -1 })
                if (!members.length) return
                var minX = Math.min.apply(null, members.map(function (n) { return n.x })) - 16
                var minY = Math.min.apply(null, members.map(function (n) { return n.y })) - 28
                var maxX = Math.max.apply(null, members.map(function (n) { return n.x + boxW })) + 16
                var maxY = Math.max.apply(null, members.map(function (n) { return n.y + boxH })) + 16
                zoomLayer.append('rect')
                  .attr('x', minX).attr('y', minY)
                  .attr('width', maxX - minX).attr('height', maxY - minY)
                  .attr('rx', 12)
                  .attr('fill', 'none')
                  .attr('stroke', 'var(--border-strong, #999)')
                  .attr('stroke-dasharray', '4 4')
                  .attr('stroke-width', 1)
                zoomLayer.append('text')
                  .attr('x', minX + 10).attr('y', minY + 14)
                  .attr('font-size', 11)
                  .attr('fill', 'var(--text-secondary, #888)')
                  .text(g.label || g.id)
              })
            }

            var linkForce = useForce
              ? d3.forceSimulation(nodes)
                  .force('link', d3.forceLink(edges).id(function (n) { return n.id }).distance(140))
                  .force('charge', d3.forceManyBody().strength(-320))
                  .force('center', d3.forceCenter(width / 2, height / 2))
                  .force('collide', d3.forceCollide(boxW / 1.5))
              : null

            var edgeSel = zoomLayer.selectAll('path.edge')
              .data(edges)
              .join('path')
              .attr('class', 'edge')
              .attr('fill', 'none')
              .attr('stroke', 'var(--border-strong, #999)')
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', function (e) { return e.style === 'dashed' ? '4 4' : null })
              .attr('marker-end', 'url(#${diagramId}-arrow)')

            function edgePath(e) {
              var s = idToNode[e.source], t = idToNode[e.target]
              if (!s || !t) return ''
              if (useForce) {
                return 'M' + s.x + ',' + s.y + ' L' + t.x + ',' + t.y
              }
              var x1, y1, x2, y2, mx, my
              if (direction === 'LR') {
                x1 = s.x + boxW; y1 = s.y + boxH / 2
                x2 = t.x; y2 = t.y + boxH / 2
                mx = (x1 + x2) / 2
                return 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2
              }
              x1 = s.x + boxW / 2; y1 = s.y + boxH
              x2 = t.x + boxW / 2; y2 = t.y
              my = (y1 + y2) / 2
              return 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2
            }
            if (!useForce) edgeSel.attr('d', edgePath)

            var edgeLabelSel = zoomLayer.selectAll('text.edge-label')
              .data(edges.filter(function (e) { return e.label }))
              .join('text')
              .attr('class', 'edge-label')
              .attr('font-size', 11)
              .attr('fill', 'var(--text-secondary, #666)')
              .attr('text-anchor', 'middle')
              .text(function (e) { return e.label })

            function positionEdgeLabels() {
              edgeLabelSel
                .attr('x', function (e) {
                  var s = idToNode[e.source], t = idToNode[e.target]
                  return direction === 'LR' || useForce ? (s.x + t.x) / 2 : (s.x + t.x) / 2 + boxW / 2
                })
                .attr('y', function (e) {
                  var s = idToNode[e.source], t = idToNode[e.target]
                  return direction === 'LR' || useForce ? (s.y + t.y) / 2 - 8 : (s.y + t.y) / 2
                })
            }
            if (!useForce) positionEdgeLabels()

            var nodeGroup = zoomLayer.selectAll('g.node')
              .data(nodes)
              .join('g')
              .attr('class', 'node')
              .attr('tabindex', 0)
              .attr('role', 'button')
              .attr('aria-label', function (n, i) {
                var outgoing = edges.filter(function (e) { return e.source === n.id })
                var next = outgoing.map(function (e) {
                  var t = idToNode[e.target]
                  return t ? (t.label || t.id) : e.target
                }).join(', ')
                return 'Node ' + (i + 1) + ' of ' + nodes.length + ': ' + (n.label || n.id) +
                  (n.type ? ', type ' + n.type : '') +
                  (next ? '. Connects to ' + next : '. No outgoing connections.')
              })
              .style('cursor', useForce ? 'grab' : 'pointer')
              .style('outline', 'none')

            function nodeTransform(n) {
              return useForce
                ? 'translate(' + (n.x - boxW / 2) + ',' + (n.y - boxH / 2) + ')'
                : 'translate(' + n.x + ',' + n.y + ')'
            }
            nodeGroup.attr('transform', nodeTransform)

            nodeGroup.append('rect')
              .attr('width', boxW)
              .attr('height', boxH)
              .attr('rx', 8)
              .attr('fill', 'var(--surface-2, #fff)')
              .attr('stroke', function (n) { return colorOf(n) })
              .attr('stroke-width', 1.5)

            nodeGroup.append('rect')
              .attr('width', boxW).attr('height', 4)
              .attr('rx', 2)
              .attr('fill', function (n) { return colorOf(n) })

            nodeGroup.append('text')
              .attr('x', boxW / 2)
              .attr('y', boxH / 2 + 4)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .attr('font-size', 13)
              .attr('fill', 'var(--text-primary, #1a1a1a)')
              .text(function (n) { return n.label || n.id })

            nodeGroup
              .on('focus', function (event, n) {
                d3.select(this).select('rect').attr('stroke-width', 3)
                if (liveRegion) liveRegion.textContent = (n.label || n.id) + (n.type ? ', ' + n.type : '')
              })
              .on('blur', function () {
                d3.select(this).select('rect').attr('stroke-width', 1.5)
              })
              .on('keydown', function (event, n) {
                var idx = nodes.indexOf(n)
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  focusNodeAt(Math.min(idx + 1, nodes.length - 1))
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusNodeAt(Math.max(idx - 1, 0))
                }
              })

            function focusNodeAt(idx) {
              var el = nodeGroup.nodes()[idx]
              if (el) el.focus()
            }

            if (useForce) {
              nodeGroup.call(
                d3.drag()
                  .on('start', function (event, n) {
                    if (!event.active) linkForce.alphaTarget(0.3).restart()
                    n.fx = n.x; n.fy = n.y
                  })
                  .on('drag', function (event, n) { n.fx = event.x; n.fy = event.y })
                  .on('end', function (event, n) {
                    if (!event.active) linkForce.alphaTarget(0)
                    n.fx = null; n.fy = null
                  })
              )
              linkForce.on('tick', function () {
                edgeSel.attr('d', edgePath)
                positionEdgeLabels()
                nodeGroup.attr('transform', nodeTransform)
              })
            }

            // ── Zoom / pan ──
            var zoom = d3.zoom()
              .scaleExtent([0.4, 2.5])
              .on('zoom', function (event) { zoomLayer.attr('transform', event.transform) })
            svg.call(zoom)

            var toolbar = root.parentElement.querySelector('div')
            var btnOut = root.parentElement.querySelector('[data-action="zoom-out"]')
            var btnIn = root.parentElement.querySelector('[data-action="zoom-in"]')
            var btnReset = root.parentElement.querySelector('[data-action="zoom-reset"]')
            if (btnIn) btnIn.addEventListener('click', function () { svg.transition().call(zoom.scaleBy, 1.3) })
            if (btnOut) btnOut.addEventListener('click', function () { svg.transition().call(zoom.scaleBy, 0.75) })
            if (btnReset) btnReset.addEventListener('click', function () { svg.transition().call(zoom.transform, d3.zoomIdentity) })
          }
          render()
        })()
      </script>
    `

    return {
      type: 'diagram',
      hName: 'diagram',
      hProperties: {
        className: 'custom-block diagram-block',
        dataTitle: title,
        htmlContent,
      },
    }
  },
})

// small helper used only server/handler-side for the legend swatches above
function diagramColor(i) {
  const palette = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#BA7517']
  return palette[i % palette.length]
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STYLED TABLE BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'table',
  label: 'Styled Table',
  icon: 'table_chart',
  pattern: /\[!table\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!table(title="Data Table" headers="Name,Age,Location" rows="John,25,NY|Jane,22,CA")]',
  handler: (match) => {
    const params = parseBlockParams(match[1] || '')
    return {
      type: 'customtable',
      hName: 'customtable',
      hProperties: {
        className: 'custom-block styled-table-block',
        ...params,
      },
    }
  },
})

const legacyBlocks = ['fbpost', 'tweet', 'youtube', 'tiktok', 'instagram', 'reddit', 'vimeo', 'codepen', 'gist']

legacyBlocks.forEach(name => {
  blockRegistry.register({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    icon: 'extension',
    pattern: new RegExp(`\\[!${name}\\s*\\(\\s*url\\s*=\\s*["']?(.+?)["']?\\s*\\)\\s*\\]`),
    handler: (match) => {
      const url = match[1] || ''
      // We can just reuse the embed logic here
      const embedResult = (blockRegistry.getBlock('embed') as any).handler(['', url])
      return {
        type: name,
        hName: name,
        hProperties: embedResult.hProperties
      }
    }
  })
})

export { blockRegistry }
