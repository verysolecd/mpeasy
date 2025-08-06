import type { MarkedExtension } from 'marked'
import type { HeadingItem } from '../../src/types'

// A simple slugger that mimics marked's logic, including handling duplicates.
class SimpleSlugger {
  private seen: { [key: string]: number } = {};

  slug(value: string): string {
    let slug = value
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\d\u4e00-\u9fa5\-]+/g, '') // Allow Chinese characters
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (this.seen[slug]) {
      const originalSlug = slug;
      do {
        this.seen[originalSlug]++;
        slug = `${originalSlug}-${this.seen[originalSlug]}`;
      } while (this.seen[slug]);
    }
    this.seen[slug] = 0;
    return slug;
  }

  reset() {
      this.seen = {};
  }
}

/**
 * marked 插件：支持 [TOC] 语法，自动生成嵌套目录
 */
export function markedToc(): MarkedExtension {
  let headings: HeadingItem[] = []
  const slugger = new SimpleSlugger();

  return {
    name: 'mpeasy-toc',
    // Use hooks for state management per parse
    hooks: {
      preprocess(markdown) {
        headings = []
        slugger.reset();
        return markdown
      },
    },
    walkTokens(token) {
      if (token.type === `heading`) {
        const text = token.text || ``
        const depth = token.depth || 1
        const slug = slugger.slug(text)
        headings.push({ text, depth, slug })
      }
    },
    extensions: [
      {
        name: `toc`,
        level: `block`,
        start(src) {
          const match = src.match(/^\s*\[TOC\]\s*$/m)
          return match ? match.index : undefined
        },
        tokenizer(src) {
          const match = /^\[TOC\]/.exec(src)
          if (match) {
            return {
              type: `toc`,
              raw: match[0],
            }
          }
        },
        renderer() {
          if (!headings.length) {
            return ``
          }

          let html = `<nav class="markdown-toc"><ul class="toc-ul toc-level-1 pl-4 border-l ml-2">`
          let lastDepth = 1

          headings.forEach(({ text, depth, slug }) => {
            if (depth > lastDepth) {
              for (let i = lastDepth + 1; i <= depth; i++) {
                html += `<ul class="toc-ul toc-level-${i} pl-4 border-l ml-2">`
              }
            }
            else if (depth < lastDepth) {
              for (let i = lastDepth; i > depth; i--) {
                html += `</ul>`
              }
            }
            html += `<li class="toc-li toc-level-${depth} mb-1"><a class="text-gray-700 hover:text-blue-600 underline transition-colors" href="#${slug}">${text}</a></li>`
            lastDepth = depth
          })

          for (let i = lastDepth; i > 1; i--) {
            html += `</ul>`
          }

          html += `</ul></nav>`

          return html
        },
      },
    ],
  }
}
