import { blockRegistry } from './block-registry'

/**
 * Custom MDX blocks.
 * hProperties MUST use data-* attributes (e.g. data-url, data-html)
 * because rehype lowercases all camelCase keys, breaking prop delivery.
 * Using data-* ensures reliable pass-through to React component maps.
 */

// ── UNIFIED EMBED BLOCK ──────────────────────────────────────────────────────
blockRegistry.register({
  name: 'embed',
  label: 'Social Embed',
  icon: 'share',
  pattern: /\[!embed\s*\(\s*url\s*=\s*["']?(.+?)["']?\s*\)\s*\]/,
  template: '[!embed(url="")]',
  handler: (match) => {
    const url = (match[1] || '').trim()
    let html = ''
    let type = 'generic-embed'

    if (url.includes('facebook.com')) {
      type = 'fbpost-embed'
      html = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="700" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      type = 'tweet-embed'
      html = `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      type = 'youtube-embed'
      const vid = (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) || [])[1] || ''
      html = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${vid}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    } else if (url.includes('tiktok.com')) {
      type = 'tiktok-embed'
      html = `<blockquote class="tiktok-embed" cite="${url}" style="max-width:500px"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`
    } else if (url.includes('instagram.com')) {
      type = 'instagram-embed'
      html = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><section></section></blockquote><script async src="//www.instagram.com/embed.js"></script>`
    } else if (url.includes('reddit.com')) {
      type = 'reddit-embed'
      html = `<blockquote class="reddit-embed" data-embed-height="500"><a href="${url}">Post</a></blockquote><script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`
    } else if (url.includes('vimeo.com')) {
      type = 'vimeo-embed'
      const vid = (url.match(/vimeo\.com\/(\d+)/) || [])[1] || ''
      html = `<iframe src="https://player.vimeo.com/video/${vid}" width="100%" height="400" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
    } else if (url.includes('codepen.io')) {
      type = 'codepen-embed'
      html = `<iframe height="400" style="width:100%" scrolling="no" src="${url}" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true"></iframe>`
    } else if (url.includes('gist.github.com')) {
      type = 'gist-embed'
      html = `<script src="${url}.js"></script>`
    } else {
      html = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    }

    return {
      type: 'embed',
      hName: 'customembed',
      hProperties: {
        class: `custom-block ${type}`,
        'data-url': url,
        'data-html': html,
      },
    }
  },
})

// ── RUN CODE BLOCK ────────────────────────────────────────────────────────────
blockRegistry.register({
  name: 'run',
  label: 'Run Code',
  icon: 'terminal',
  pattern: /\[!run\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!run()]',
  handler: (match) => {
    let code = (match[1] || '').trim()
    const m = code.match(/^code=["']([\s\S]*?)["']$/)
    if (m) code = m[1]
    return {
      type: 'run',
      hName: 'customrun',
      hProperties: {
        class: 'custom-block run-code',
        'data-html': code,
      },
    }
  },
})

// ── CUSTOM STYLE BLOCK ────────────────────────────────────────────────────────
blockRegistry.register({
  name: 'style',
  label: 'Custom CSS',
  icon: 'palette',
  pattern: /\[!style\s*\(([\s\S]*?)\)\s*\]/,
  template: '[!style()]',
  handler: (match) => {
    let css = (match[1] || '').trim()
    const m = css.match(/^css=["']([\s\S]*?)["']$/)
    if (m) css = m[1]
    return {
      type: 'style',
      hName: 'customstyle',
      hProperties: {
        class: 'custom-block custom-style',
        'data-html': `<style>${css}</style>`,
      },
    }
  },
})

// ── LEGACY SHORTHAND BLOCKS (fbpost, tweet, youtube, etc.) ───────────────────
const legacyNames = ['fbpost', 'tweet', 'youtube', 'tiktok', 'instagram', 'reddit', 'vimeo', 'codepen', 'gist']

legacyNames.forEach(name => {
  blockRegistry.register({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    icon: 'extension',
    pattern: new RegExp(`\\[!${name}\\s*\\(\\s*url\\s*=\\s*["']?(.+?)["']?\\s*\\)\\s*\\]`),
    handler: (match) => {
      const embedHandler = blockRegistry.getBlock('embed')!.handler
      const result = embedHandler(['', match[1]] as unknown as RegExpMatchArray)
      return { type: name, hName: `custom${name}`, hProperties: result.hProperties }
    },
  })
})

export { blockRegistry }
