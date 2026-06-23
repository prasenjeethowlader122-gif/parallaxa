import { blockRegistry } from './block-registry'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CUSTOM MDX BLOCKS - সহজেই নতুন block যোগ করুন
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SYNTAX: [!blockname(url="https://...")]
 *
 * EXAMPLES:
 *   [!fbpost(url="https://facebook.com/...")]
 *   [!tweet(url="https://twitter.com/...")]
 *   [!youtube(url="https://youtube.com/...")]
 *   [!tiktok(url="https://tiktok.com/...")]
 *   [!instagram(url="https://instagram.com/...")]
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FACEBOOK POST BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'fbpost',
  pattern: /^\s*\[!fbpost\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'fbpost',
    hProperties: {
      className: 'custom-block fbpost-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<iframe 
        src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" 
        width="500" 
        height="700" 
        style="border:none;overflow:hidden" 
        scrolling="no" 
        frameborder="0" 
        allowfullscreen="true" 
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
      </iframe>`,
    },
  }),
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━
//  TWITTER/X BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'tweet',
  pattern: /^\s*\[!tweet\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'tweet',
    hProperties: {
      className: 'custom-block tweet-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`,
    },
  }),
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  YOUTUBE VIDEO BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'youtube',
  pattern: /^\s*\[!youtube\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => {
    // YouTube video ID extract করুন
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    return {
      type: 'youtube',
      hProperties: {
        className: 'custom-block youtube-embed',
        dataUrl: url,
        dangerouslySetInnerHTML: `<iframe 
          width="100%" 
          height="400" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>`,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIKTOK VIDEO BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'tiktok',
  pattern: /^\s*\[!tiktok\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'tiktok',
    hProperties: {
      className: 'custom-block tiktok-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<blockquote class="tiktok-embed" cite="${url}" data-unique-id="0" style="max-width: 500px;"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`,
    },
  }),
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INSTAGRAM POST BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'instagram',
  pattern: /^\s*\[!instagram\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'instagram',
    hProperties: {
      className: 'custom-block instagram-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><section></section></blockquote><script async src="//www.instagram.com/embed.js"></script>`,
    },
  }),
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  REDDIT POST BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'reddit',
  pattern: /^\s*\[!reddit\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'reddit',
    hProperties: {
      className: 'custom-block reddit-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<blockquote class="reddit-embed" data-embed-height="500"><a href="${url}">Post</a></blockquote><script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`,
    },
  }),
})

// ━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VIMEO VIDEO BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'vimeo',
  pattern: /^\s*\[!vimeo\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => {
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    return {
      type: 'vimeo',
      hProperties: {
        className: 'custom-block vimeo-embed',
        dataUrl: url,
        dangerouslySetInnerHTML: `<iframe 
          src="https://player.vimeo.com/video/${videoId}" 
          width="100%" 
          height="400" 
          frameborder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowfullscreen>
        </iframe>`,
      },
    }
  },
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CODEPEN EMBED BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'codepen',
  pattern: /^\s*\[!codepen\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => ({
    type: 'codepen',
    hProperties: {
      className: 'custom-block codepen-embed',
      dataUrl: url,
      dangerouslySetInnerHTML: `<iframe 
        height="400" 
        style="width: 100%;" 
        scrolling="no" 
        title="Pen" 
        src="${url}" 
        frameborder="no" 
        loading="lazy" 
        allowtransparency="true" 
        allowfullscreen="true">
      </iframe>`,
    },
  }),
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GITHUB GIST BLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
blockRegistry.register({
  name: 'gist',
  pattern: /^\s*\[!gist\(url="(.+?)"\)\]\s*$/,
  handler: (match, url) => {
    const gistId = url.split('/').pop()?.replace('.js', '')

    return {
      type: 'gist',
      hProperties: {
        className: 'custom-block gist-embed',
        dataUrl: url,
        dangerouslySetInnerHTML: `<script src="${url}.js"></script>`,
      },
    }
  },
})

export { blockRegistry }
