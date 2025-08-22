import type { RendererObject, Tokens } from 'marked';
import type { ReadTimeResults } from 'reading-time';
import type { IOpts, Theme } from '../types';
import type { RendererAPI } from '../types';
import gdscript from '@exercism/highlightjs-gdscript';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import { marked } from 'marked';

import readingTime from 'reading-time';
import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';
import { themeMap } from './theme';

hljs.registerLanguage(`gdscript`, gdscript)

marked.setOptions({
  breaks: true,
})
marked.use(markedSlider())

function styleObjectToString(style: Record<string, string>): string {
  return Object.entries(style).map(([key, value]) => `${key}: ${value}`).join(';');
}

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
        ? `<code>[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
        : `<code>[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`,
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
    console.log('Renderer: setOptions called with newOpts.isUseIndent', newOpts.isUseIndent);
    opts = { ...opts, ...newOpts }
    console.log('Renderer: opts.isUseIndent after update', opts.isUseIndent);
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
    const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
    const blockquoteStyle = styleObjectToString(theme.block.blockquote);
    const pStyle = styleObjectToString(theme.block.blockquote_p);
    return `
      <blockquote style="${blockquoteStyle}">
        <p style="${pStyle}">字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) {
      return ``
    }
    const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
    const h4Style = styleObjectToString(theme.block.h4);
    const pStyle = styleObjectToString(theme.block.footnotes);

    return (
      `<h4 style="${h4Style}">引用链接</h4>`
      + `<p style="${pStyle}">${buildFootnoteArray(footnotes)}</p>`
    )
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.block[`h${depth}` as keyof Theme['block']]);
      const text = this.parser.parseInline(tokens)
      return `<h${depth} style="${style}">${text}</h${depth}>`
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      let style = styleObjectToString(theme.block.p);
      if (opts.isUseIndent) {
        className = 'mpeasy-indent';
      } else {
                style += ';text-indent: 0 !important;';
      }
      console.log('Renderer: paragraph function - opts.isUseIndent', opts.isUseIndent);
      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`)
      const isEmpty = text.trim() === ``
      if (isFigureImage || isEmpty) {
        return text
      }
      return `<p class="${className}" style="${style}">${text}</p>`
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const blockquoteStyle = styleObjectToString(theme.block.blockquote);
      const pStyle = styleObjectToString(theme.block.blockquote_p);
      let text = this.parser.parse(tokens)
      text = text.replace(/<p>/g, `<p style="${pStyle}">`)
      return `<blockquote style="${blockquoteStyle}">${text}</blockquote>`
    },

    code({ text, lang = `` }: Tokens.Code): string {
      if (lang.startsWith(`mermaid`)) {
        return `<pre class="mermaid">${text}</pre>`
      }

      const langText = lang.split(` `)[0]
      const language = hljs.getLanguage(langText) ? langText : `plaintext`

      let highlighted = hljs.highlight(text, { language }).value
      highlighted = highlighted.replace(/\t/g, `    `)
      highlighted = highlighted.replace(/\r?\n/g, `<br/>`)
      highlighted = highlighted
        .replace(/(>[^<]+)|(^[^<]+)/g, str => str.replace(/\s/g, `&nbsp;`))

      const isShowMacStyleBar = lang.includes(`=b`) || opts.isMacCodeBlock
      const macBar = isShowMacStyleBar ? `<span class="mac-sign" style="padding: 10px 14px 0;">${macCodeSvg}</span>` : '';
      
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const preStyle = styleObjectToString(theme.block.code_pre);
      const codeStyle = styleObjectToString(theme.block.code);

      return `<pre style="${preStyle}">
        <div class="mpe-code-header">${macBar}</div>
        <code style="${codeStyle}">${highlighted}</code>
      </pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.inline.codespan);
      const escapedText = escapeHtml(text)
      return `<code style="${style}">${escapedText}</code>`
    },

    list({ ordered, items }: Tokens.List) {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(ordered ? theme.block.ol : theme.block.ul);
      const tag = ordered ? `ol` : `ul`;
      const body = items.map(item => this.listitem(item)).join('');
      return `<${tag} style="${style}">${body}</${tag}>`;
    },

    listitem(token: Tokens.ListItem) {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.inline.listitem);
      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      }
      catch {
        content = this.parser
          .parse(token.tokens)
          .replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/, `$1`)
      }

      return `<li style="${style}">${content}</li>`
    },

    image({ href, title, text }: Tokens.Image): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const figureStyle = styleObjectToString(theme.block.figure);
      const imgStyle = styleObjectToString(theme.block.image);
      const figcaptionStyle = styleObjectToString(theme.inline.figcaption);
      const subText = `<figcaption style="${figcaptionStyle}">${transform(opts.legend!, text, title)}</figcaption>`
      return `<figure style="${figureStyle}"><img style="${imgStyle}" src="${href}" title="${title}" alt="${text}"/>${subText}</figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const parsedText = this.parser.parseInline(tokens)
      if (/^https?:\/\/mp\.weixin\.qq\.com/.test(href)) {
        const style = styleObjectToString(theme.inline.wx_link);
        return `<a style="${style}" href="${href}" title="${title || text}">${parsedText}</a>`
      }
      if (href === text) {
        return parsedText
      }
      if (opts.isCiteStatus) {
        const ref = addFootnote(title || text, href)
        const supStyle = styleObjectToString(theme.inline.sup);
        return `<span>${parsedText}<sup style="${supStyle}">[${ref}]</sup></span>`
      }
      const style = styleObjectToString(theme.inline.link);
      return `<span style="${style}">${parsedText}</span>`
    },

    strong({ tokens }: Tokens.Strong): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.inline.strong);
      return `<strong style="${style}">${this.parser.parseInline(tokens)}</strong>`
    },

    em({ tokens }: Tokens.Em): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.inline.em);
      return `<em style="${style}">${this.parser.parseInline(tokens)}</em>`
    },

    table({ header, rows }: Tokens.Table): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const tableStyle = styleObjectToString(theme.inline.table);
      const theadStyle = styleObjectToString(theme.inline.thead);

      const headerRow = header
        .map((cell) => {
          return this.tablecell(cell.tokens, true);
        })
        .join(``)
      const body = rows
        .map((row) => {
          const rowContent = row
            .map(cell => this.tablecell(cell.tokens, false))
            .join(``)
          return `<tr>${rowContent}</tr>`
        })
        .join(``)
      return `
        <section>
          <table style="${tableStyle}">
            <thead style="${theadStyle}"><tr>${headerRow}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `
    },

    tablecell(tokens: Tokens.TableCell['tokens'], isHeader: boolean): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(isHeader ? theme.inline.th : theme.inline.td);
      const text = this.parser.parseInline(tokens)
      const tag = isHeader ? 'th' : 'td';
      return `<${tag} style="${style}">${text}</${tag}>`
    },

    hr(_: Tokens.Hr): string {
      const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
      const style = styleObjectToString(theme.block.hr);
      return `<hr style="${style}"/>`
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
    const theme = themeMap[opts.layoutThemeName as keyof typeof themeMap] || themeMap.default;
    const style = styleObjectToString(theme.base);
    return `<section style="${style}; --md-primary-color: ${opts.primaryColor};">${content}</section>`;
  }

  async function parse(markdown: string): Promise<string> {
    const { markdownContent, readingTime: readingTimeResult } = parseFrontMatterAndContent(markdown);
    let html = marked.parse(markdownContent) as string;
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
      let fullStyle = '';

      // Base styles
      fullStyle += `section { ${styleObjectToString(theme.base)} }
`;

      // Block styles
      for (const key in theme.block) {
        if (Object.prototype.hasOwnProperty.call(theme.block, key)) {
          fullStyle += `${key} { ${styleObjectToString(theme.block[key])} }
`;
        }
      }

      // Inline styles
      for (const key in theme.inline) {
        if (Object.prototype.hasOwnProperty.call(theme.inline, key)) {
          fullStyle += `${key} { ${styleObjectToString(theme.inline[key])} }
`;
        }
      }
      return fullStyle;
    }
  }
}
