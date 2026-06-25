import { blockRegistry } from './block-registry'

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
