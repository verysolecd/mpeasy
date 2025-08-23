import type { RendererObject, Tokens } from 'marked';
import type { ReadTimeResults } from 'reading-time';
import type { IOpts } from '../types';
import type { RendererAPI } from '../types';
import gdscript from '@exercism/highlightjs-gdscript';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import juice from 'juice';
import { marked } from 'marked';

import readingTime from 'reading-time';
import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';
import { generateStylesheet, themeMap } from './theme';

hljs.registerLanguage(`gdscript`, gdscript)

marked.setOptions({
  breaks: true,
})
marked.use(markedSlider())

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
    .replace(/`/g, `&#96;`)
}

function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([index, title, link]) =>
      link === title
        ? `<code>[${index}]</code>: <i>${title}</i><br/>`
        : `<code>[${index}]</code> ${title}: <i>${link}</i><br/>`,
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
    marked.use({ renderer })
  }

  function buildReadingTime(readingTime: ReadTimeResults): string {
    if (!opts.isCountStatus) {
      return ``
    }
    if (!readingTime.words) {
      return ``
    }
    return `
      <blockquote>
        <p>字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) {
      return ``
    }
    return (
      `<h4>引用链接</h4>`
      + `<p>${buildFootnoteArray(footnotes)}</p>`
    )
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens)
      return `<h${depth}>${text}</h${depth}>`
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`)
      const isEmpty = text.trim() === ``
      if (isFigureImage || isEmpty) {
        return text
      }
      const className = opts.isUseIndent ? 'class="mpeasy-indent"' : '';
      return `<p ${className}>${text}</p>`
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      let text = this.parser.parse(tokens)
      text = text.replace(/<p>/g, `<p>`)
      return `<blockquote>${text}</blockquote>`
    },

    code({ text, lang = `` }: Tokens.Code): string {
      if (lang.startsWith(`mermaid`)) {
        return `<pre class="mermaid">${text}</pre>`
      }

      const langText = lang.split(` `)[0]
      const language = hljs.getLanguage(langText) ? langText : `plaintext`

      const trimmedText = text.trim();
      let highlighted = hljs.highlight(trimmedText, { language }).value;

      highlighted = highlighted.replace(/\r?\n/g, `<br/>`);

      const isShowMacStyleBar = lang.includes(`=b`) || opts.isMacCodeBlock
      const macBar = isShowMacStyleBar ? `<span class="mac-sign">${macCodeSvg}</span>` : '';
      const headerDiv = isShowMacStyleBar ? `<div class="mpe-code-header">${macBar}</div>` : '';

      return `<pre><code class="hljs">${headerDiv}${highlighted}</code></pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      const escapedText = escapeHtml(text)
      return `<code>${escapedText}</code>`
    },

    list({ ordered, items }: Tokens.List) {
      const tag = ordered ? `ol` : `ul`;
      const body = items.map(item => this.listitem(item)).join('');
      return `<${tag}>${body}</${tag}>`;
    },

    listitem(token: Tokens.ListItem) {
      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      }
      catch {
        content = this.parser
          .parse(token.tokens)
          .replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/, `$1`)
      }

      return `<li>${content}</li>`
    },

    image({ href, title, text }: Tokens.Image): string {
      const subText = `<figcaption>${transform(opts.legend!, text, title)}</figcaption>`
      return `<figure><img src="${href}" title="${title}" alt="${text}"/>${subText}</figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const parsedText = this.parser.parseInline(tokens)
      if (/^https?:\/\/mp\.weixin\.qq\.com/.test(href)) {
        return `<a href="${href}" title="${title || text}">${parsedText}</a>`
      }
      if (href === text) {
        return parsedText
      }
      if (opts.isCiteStatus) {
        const ref = addFootnote(title || text, href)
        return `<span>${parsedText}<sup>[${ref}]</sup></span>`
      }
      return `<span>${parsedText}</span>`
    },

    strong({ tokens }: Tokens.Strong): string {
      return `<strong>${this.parser.parseInline(tokens)}</strong>`
    },

    em({ tokens }: Tokens.Em): string {
      return `<em>${this.parser.parseInline(tokens)}</em>`
    },

    table({ header, rows }: Tokens.Table): string {
      const headerRow = header
        .map((cell) => {
          return this.tablecell(cell);
        })
        .join(``)
      const body = rows
        .map((row) => {
          const rowContent = row
            .map(cell => this.tablecell(cell))
            .join(``)
          return `<tr>${rowContent}</tr>`
        })
        .join(``)
      return (
        `<section>
          <table>
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `
      )
    },

    tablecell(token: Tokens.TableCell): string {
      const text = this.parser.parseInline(token.tokens)
      const tag = token.header ? 'th' : 'td';
      return `<${tag}>${text}</${tag}>`
    },

    hr(_: Tokens.Hr): string {
      return `<hr/>`
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

  function createContainer(content: string): string {
    return `<section>${content}</section>`;
  }

  async function parse(markdown: string, inlineStyles: boolean, codeThemeCss: string): Promise<string> {
    const { markdownContent, readingTime: readingTimeResult } = parseFrontMatterAndContent(markdown);
    
    const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
    let html = marked.parse(markdownContent) as string;

    if (inlineStyles) {
      const stylesheet = generateStylesheet(theme, opts.fontSize);
      const fullStylesheet = `${stylesheet}
${codeThemeCss}`;
      html = juice(html, { extraCss: fullStylesheet });
    } 

    html = buildReadingTime(readingTimeResult) + html;
    html += buildFootnotes();
    return createContainer(html);
  }

  return {
    setOptions,
    reset,
    parse,
    getStyles: () => {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      return generateStylesheet(theme, opts.fontSize);
    }
  }
}