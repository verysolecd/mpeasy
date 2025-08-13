import type { RendererObject, Tokens } from 'marked';
import type { ReadTimeResults } from 'reading-time';
import type { IOpts } from '../types';
import type { RendererAPI } from '../types';
import gdscript from '@exercism/highlightjs-gdscript';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import { marked } from 'marked';
import mermaid from 'mermaid';
import readingTime from 'reading-time';
import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';

hljs.registerLanguage(`gdscript`, gdscript)

marked.setOptions({
  breaks: true,
})
marked.use(markedSlider())

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`) // 转义 &
    .replace(/</g, `&lt;`) // 转义 <
    .replace(/>/g, `&gt;`) // 转义 >
    .replace(/"/g, `&quot;`) // 转义 "
    .replace(/'/g, `&#39;`) // 转义 '
    .replace(/`/g, `&#96;`) // 转义 `
}

function buildAddition(): string {
  return `
    <style>
      .preview-wrapper pre::before {
        position: absolute;
        top: 0;
        right: 0;
        color: #ccc;
        text-align: center;
        font-size: 0.8em;
        padding: 5px 10px 0;
        line-height: 15px;
        height: 15px;
        font-weight: 600;
      }
    </style>
  `
}

function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([index, title, link]) =>
      link === title
        ? `<code class="mpe-codespan">[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
        : `<code class="mpe-codespan">[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`,
    )
    .join(`
`)
}

function transform(legend: string, text: string | null, title: string | null): string {
  const options = legend.split(`-`)
  for (const option of options) {
    if (option === `alt` && text) {
      return text
    }
    if (option === `title` && title) {
      return title
    }
  }
  return ``
}

const macCodeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
    <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
    <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
    <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
  </svg>
`.trim()

interface ParseResult {
  yamlData: Record<string, any>
  markdownContent: string
  readingTime: ReadTimeResults
}

export function parseFrontMatterAndContent(markdownText: string): ParseResult {
  try {
    const parsed = frontMatter(markdownText)
    const yamlData = parsed.attributes
    const markdownContent = parsed.body

    const readingTimeResult = readingTime(markdownContent)

    return {
      yamlData: yamlData as Record<string, any>,
      markdownContent,
      readingTime: readingTimeResult,
    }
  }
  catch (error) {
    console.error(`Error parsing front-matter:`, error)
    return {
      yamlData: {},
      markdownContent: markdownText,
      readingTime: readingTime(markdownText),
    }
  }
}

export function initRenderer(opts: IOpts, getIframeWindow: () => Window | null): RendererAPI {
  const footnotes: [number, string, string][] = []
  let footnoteIndex: number = 0
  const listOrderedStack: boolean[] = []
  const listCounters: number[] = []

  function getOpts(): IOpts {
    return opts
  }

  function addFootnote(title: string, link: string): number {
    footnotes.push([++footnoteIndex, title, link])
    return footnoteIndex
  }

  function reset(newOpts: Partial<IOpts>): void {
    footnotes.length = 0
    footnoteIndex = 0
    setOptions(newOpts)
  }

  function setOptions(newOpts: Partial<IOpts>): void {
    opts = { ...opts, ...newOpts }
    marked.use(markedAlert({}))
    marked.use(
      MDKatex({ nonStandard: true }, ``, ``, getIframeWindow),
    )
  }

  function buildReadingTime(readingTime: ReadTimeResults): string {
    if (!opts.countStatus) {
      return ``
    }
    if (!readingTime.words) {
      return ``
    }
    return `
      <blockquote class="mpe-blockquote">
        <p class="mpe-paragraph mpe-blockquote-paragraph">字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) {
      return ``
    }

    return (
      `<h4 class="mpe-heading mpe-heading-4">引用链接</h4>`
      + `<p class="mpe-paragraph mpe-footnotes">${buildFootnoteArray(footnotes)}</p>`
    )
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens)
      return `<h${depth} class="mpe-heading mpe-heading-${depth}" data-heading="true">${text}</h${depth}>`
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`)
      const isEmpty = text.trim() === ``
      if (isFigureImage || isEmpty) {
        return text
      }
      return `<p class="mpe-paragraph">${text}</p>`
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      let text = this.parser.parse(tokens)
      text = text.replace(/<p class="mpe-paragraph">/g, `<p class="mpe-paragraph mpe-blockquote-paragraph">`)
      return `<blockquote class="mpe-blockquote">${text}</blockquote>`
    },

    code({ text, lang = `` }: Tokens.Code): string {
      if (lang.startsWith(`mermaid`)) {
        return `<pre class="mermaid">${text}</pre>`
      }
      const langText = lang.split(` `)[0]
      const language = hljs.getLanguage(langText) ? langText : `plaintext`
      let highlighted = hljs.highlight(text, { language }).value
      highlighted = highlighted.replace(/\t/g, `    `)
      highlighted = highlighted
        .replace(/\r\n/g, `<br/>`)
        .replace(/\n/g, `<br/>`)
        .replace(/(>[^<]+)|(^[^<]+)/g, str => str.replace(/\s/g, `&nbsp;`))
      const span = `<span class="mac-sign" style="padding: 10px 14px 0;" hidden>${macCodeSvg}</span>`
      const code = `<code class="language-${lang}">${highlighted}</code>`
      return `<pre class="hljs mpe-code-pre">${span}${code}</pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      const escapedText = escapeHtml(text)
      return `<code class="mpe-codespan">${escapedText}</code>`
    },

    list({ ordered, items, start = 1 }: Tokens.List) {
      listOrderedStack.push(ordered)
      listCounters.push(Number(start))

      const html = items
        .map(item => this.listitem(item))
        .join(``)

      listOrderedStack.pop()
      listCounters.pop()

      const listClass = ordered ? `mpe-list mpe-list-ordered` : `mpe-list mpe-list-unordered`;
      const tag = ordered ? `ol` : `ul`;
      return `<${tag} class="${listClass}">${html}</${tag}>`
    },

    listitem(token: Tokens.ListItem) {
      const ordered = listOrderedStack[listOrderedStack.length - 1]
      const idx = listCounters[listCounters.length - 1]!

      listCounters[listCounters.length - 1] = idx + 1

      const prefix = ordered
        ? `${idx}. `
        : `• `

      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      }
      catch {
        content = this.parser
          .parse(token.tokens)
          .replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/, `$1`)
      }

      return `<li class="mpe-list-item">${prefix}${content}</li>`
    },

    image({ href, title, text }: Tokens.Image): string {
      const subText = `<figcaption class="mpe-figcaption">${transform(opts.legend!, text, title)}</figcaption>`
      return `<figure class="mpe-figure"><img class="mpe-image" src="${href}" title="${title}" alt="${text}"/></figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const parsedText = this.parser.parseInline(tokens)
      if (/^https?:\/\/mp\.weixin\.qq\.com/.test(href)) {
        return `<a class="mpe-link mpe-link-wx" href="${href}" title="${title || text}">${parsedText}</a>`
      }
      if (href === text) {
        return parsedText
      }
      if (opts.citeStatus) {
        const ref = addFootnote(title || text, href)
        return `<span class="mpe-link mpe-link-cite">${parsedText}<sup>[${ref}]</sup></span>`
      }
      return `<span class="mpe-link">${parsedText}</span>`
    },

    strong({ tokens }: Tokens.Strong): string {
      return `<strong class="mpe-strong">${this.parser.parseInline(tokens)}</strong>`
    },

    em({ tokens }: Tokens.Em): string {
      return `<em class="mpe-em">${this.parser.parseInline(tokens)}</em>`
    },

    table({ header, rows }: Tokens.Table): string {
      const headerRow = header
        .map((cell) => {
          const text = this.parser.parseInline(cell.tokens)
          return `<th class="mpe-table-header-cell">${text}</th>`
        })
        .join(``)
      const body = rows
        .map((row) => {
          const rowContent = row
            .map(cell => this.tablecell(cell))
            .join(``)
          return `<tr class="mpe-table-row">${rowContent}</tr>`
        })
        .join(``)
      return `
        <section class="mpe-table-wrapper">
          <table class="mpe-table">
            <thead class="mpe-table-header">${headerRow}</thead>
            <tbody class="mpe-table-body">${body}</tbody>
          </table>
        </section>
      `
    },

    tablecell(token: Tokens.TableCell): string {
      const text = this.parser.parseInline(token.tokens)
      return `<td class="mpe-table-cell">${text}</td>`
    },

    hr(_: Tokens.Hr): string {
      return `<hr class="mpe-hr"/>`
    },
  }

  marked.use({ renderer })
  marked.use(markedToc())
  marked.use(markedSlider({}))
  marked.use(markedAlert({}))
  marked.use(
    MDKatex({ nonStandard: true }, ``, ``, getIframeWindow),
  )
  marked.use(markedFootnotes())

  function createContainer(content: string) {
    const themeClass = opts.obsidianTheme ? `theme-${opts.obsidianTheme}` : '';
    const indentClass = opts.isUseIndent ? 'mpe-use-indent' : '';
    return `<section class="mpeasy-container ${themeClass} ${indentClass}">${content}</section>`;
  }

  async function parse(markdown: string): Promise<string> {
    const { markdownContent, readingTime: readingTimeResult } = parseFrontMatterAndContent(markdown);
    let html = marked.parse(markdownContent) as string;
    html = buildReadingTime(readingTimeResult) + html;
    html += buildFootnotes();
    html += buildAddition();
    if (getOpts().isMacCodeBlock) {
        html += `
        <style>
          .hljs.mpe-code-pre > .mac-sign {
            display: flex;
          }
        </style>
      `
    }
    html += `
    <style>
      .mpe-code-pre {
        padding: 0 !important;
      }

      .hljs.mpe-code-pre code {
        display: -webkit-box;
        padding: 0.5em 1em 1em;
        overflow-x: auto;
        text-indent: 0;
      }
      h2.mpe-heading strong.mpe-strong {
        color: inherit !important;
      }
      
    </style>
  `
    return createContainer(html);
  }

  return {
    buildAddition,
    buildFootnotes,
    setOptions,
    reset,
    parseFrontMatterAndContent,
    buildReadingTime,
    getOpts,
    parse,
  }
}