// MPEasy Wechat Renderer - A high-fidelity port of the refmd rendering engine.
// This file aims to replicate refmd's rendering logic as closely as possible.

import { marked, RendererObject, Tokens } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import juice from 'juice';
import frontMatter from 'front-matter';
import readingTime, { ReadTimeResults } from 'reading-time';

import { themeMap, ThemeStyles } from './themes';
import { markedAlert } from './marked-extensions/alert';
import { markedFootnotes } from './marked-extensions/footnotes';
import { MDKatex } from './marked-extensions/katex';
import { markedPlantUML } from './marked-extensions/plantuml';
import { markedSlider } from './marked-extensions/slider';
import { markedToc } from './marked-extensions/toc';

// --- Type Definitions (Inferred from usage) ---

export interface IOpts {
    theme: any; // from themeMap
    fonts: string;
    size: string;
    isUseIndent: boolean;
    isUseJustify: boolean;
    isMacCodeBlock: boolean;
    citeStatus: boolean;
    primaryColor: string;
    codeBlockTheme: string;
    legend?: string;
    countStatus?: boolean;
}

interface RendererAPI {
    buildAddition: () => string;
    buildFootnotes: () => string;
    setOptions: (newOpts: Partial<IOpts>) => void;
    reset: (newOpts: Partial<IOpts>) => void;
    parseFrontMatterAndContent: (markdownText: string) => ParseResult;
    buildReadingTime: (readingTime: ReadTimeResults) => string;
    createContainer: (content: string) => string;
    getOpts: () => IOpts;
}

interface ParseResult {
    yamlData: Record<string, any>;
    markdownContent: string;
    readingTime: ReadTimeResults;
}


// --- Helper Functions (Ported from refmd utils) ---

function cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function toMerged<T extends Record<string, any>>(...args: T[]): T {
    return Object.assign({}, ...args);
}

function buildTheme(opts: IOpts): any {
    const theme = cloneDeep(opts.theme);
    const base = toMerged(theme.base, {
        'font-family': opts.fonts,
        'font-size': opts.size,
        '--md-primary-color': opts.primaryColor,
    });

    if (opts.isUseIndent) {
        theme.block.p = {
            'text-indent': '2em',
            ...theme.block.p,
        };
    }

    if (opts.isUseJustify) {
        theme.block.p = {
            'text-align': 'justify',
            ...theme.block.p,
        };
    }

    const mergeStyles = (styles: Record<string, any>): Record<string, any> =>
        Object.fromEntries(
            Object.entries(styles).map(([ele, style]) => [ele, toMerged(base, style)]),
        );
    return { ...mergeStyles(theme.inline), ...mergeStyles(theme.block) };
}

function getStyleString(style: Record<string, any>): string {
    return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join('; ');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

function transform(legend: string, text: string | null, title: string | null): string {
  const options = legend.split('-');
  for (const option of options) {
    if (option === 'alt' && text) {
      return text;
    }
    if (option === 'title' && title) {
      return title;
    }
  }
  return '';
}

const macCodeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
    <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
    <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
    <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
  </svg>
`.trim();


// --- Renderer Implementation ---

function initRenderer(opts: IOpts): RendererAPI {
    const footnotes: [number, string, string][] = [];
    let footnoteIndex: number = 0;
    let styleMapping: ThemeStyles = buildTheme(opts);
    let codeIndex: number = 0;
    const listOrderedStack: boolean[] = [];
    const listCounters: number[] = [];

    function getOpts(): IOpts {
        return opts;
    }

    function styles(tag: string, addition: string = ''): string {
        const dict = styleMapping[tag as keyof ThemeStyles];
        if (!dict) {
            return '';
        }
        const styleStr = getStyleString(dict);
        return `style="${styleStr}${addition}"`;
    }

    function styledContent(styleLabel: string, content: string, tagName?: string): string {
        const tag = tagName ?? styleLabel;
        return `<${tag} ${/^h\d$/.test(tag) ? 'data-heading="true"' : ''} ${styles(styleLabel)}>${content}</${tag}>`;
    }

    function addFootnote(title: string, link: string): number {
        footnotes.push([++footnoteIndex, title, link]);
        return footnoteIndex;
    }

    function reset(newOpts: Partial<IOpts>): void {
        footnotes.length = 0;
        footnoteIndex = 0;
        setOptions(newOpts);
    }

    function setOptions(newOpts: Partial<IOpts>): void {
        opts = { ...opts, ...newOpts };
        styleMapping = buildTheme(opts);
        
        // Re-register extensions that depend on styles
        marked.use(markedAlert({ styles: styleMapping }));
        marked.use(markedSlider({ styles: styleMapping }));
        marked.use(
            MDKatex({ nonStandard: true }, styles('inline_katex', ';vertical-align: middle; line-height: 1;'), styles('block_katex', ';text-align: center;'))
        );
    }
    
    function parseFrontMatterAndContent(markdownText: string): ParseResult {
        try {
            const parsed = frontMatter(markdownText);
            return {
                yamlData: parsed.attributes as Record<string, any>,
                markdownContent: parsed.body,
                readingTime: readingTime(parsed.body),
            };
        } catch (error) {
            console.error('Error parsing front-matter:', error);
            return {
                yamlData: {},
                markdownContent: markdownText,
                readingTime: readingTime(markdownText),
            };
        }
    }

    function buildReadingTime(readingTime: ReadTimeResults): string {
        if (!opts.countStatus || !readingTime.words) {
            return '';
        }
        return `
            <blockquote ${styles('blockquote')}>
                <p ${styles('blockquote_p')}>字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
            </blockquote>
        `;
    }

    const buildFootnotes = () => {
        if (!footnotes.length) {
            return '';
        }
        const footnoteArray = footnotes
            .map(([index, title, link]) =>
                link === title
                    ? `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
                    : `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`
            )
            .join('\n');
        return styledContent('h4', '引用链接') + styledContent('footnotes', footnoteArray, 'p');
    };
    
    const buildAddition = () => {
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
        `;
    };

    const renderer: RendererObject = {
        heading({ tokens, depth }: Tokens.Heading) {
            const text = this.parser.parseInline(tokens);
            return styledContent(`h${depth}`, text);
        },
        paragraph({ tokens }: Tokens.Paragraph): string {
            const text = this.parser.parseInline(tokens);
            if (text.includes('<figure') && text.includes('<img')) return text;
            if (text.trim() === '') return text;
            return styledContent('p', text);
        },
        blockquote({ tokens }: Tokens.Blockquote): string {
            let text = this.parser.parse(tokens);
            text = text.replace(/<p .*?>/g, `<p ${styles('blockquote_p')}>`);
            return styledContent('blockquote', text);
        },
        code({ text, lang = '' }: Tokens.Code): string {
            if (lang.startsWith('mermaid')) {
                clearTimeout(codeIndex);
                codeIndex = setTimeout(() => mermaid.run(), 0) as any as number;
                return `<pre class="mermaid">${text}</pre>`;
            }
            const langText = lang.split(' ')[0];
            const language = hljs.getLanguage(langText) ? langText : 'plaintext';
            let highlighted = hljs.highlight(text, { language }).value;

            highlighted = highlighted.replace(/\t/g, '    ')
                .replace(/\r\n/g, '<br/>')
                .replace(/\n/g, '<br/>')
                .replace(/(>[^<]+)|(^[^<]+)/g, str => str.replace(/\s/g, '&nbsp;'));

            const span = `<span class="mac-sign" style="padding: 10px 14px 0;" hidden>${macCodeSvg}</span>`;
            const code = `<code class="language-${lang}" ${styles('code')}>${highlighted}</code>`;
            return `<pre class="hljs code__pre" ${styles('code_pre')}>${opts.isMacCodeBlock ? span : ''}${code}</pre>`;
        },
        codespan({ text }: Tokens.Codespan): string {
            return styledContent('codespan', escapeHtml(text), 'code');
        },
        list({ ordered, items, start = 1 }: Tokens.List) {
            listOrderedStack.push(ordered);
            listCounters.push(Number(start));
            const html = items.map(item => this.parser.parse([item])).join('');
            listOrderedStack.pop();
            listCounters.pop();
            return styledContent(ordered ? 'ol' : 'ul', html);
        },
        listitem(token: Tokens.ListItem) {
            const ordered = listOrderedStack[listOrderedStack.length - 1];
            const idx = listCounters[listCounters.length - 1]!;
            listCounters[listCounters.length - 1] = idx + 1;
            const prefix = ordered ? `${idx}. ` : '• ';
            let content = this.parser.parse(token.tokens).replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>$/, '$1');
            return styledContent('listitem', `${prefix}${content}`, 'li');
        },
        image({ href, title, text }: Tokens.Image): string {
            const subText = styledContent('figcaption', transform(opts.legend!, text, title));
            return `<figure ${styles('figure')}><img ${styles('image')} src="${href}" title="${title}" alt="${text}"/>${subText}</figure>`;
        },
        link({ href, title, text, tokens }: Tokens.Link): string {
            const parsedText = this.parser.parseInline(tokens);
            if (/^https?:\/\/mp\.weixin\.qq\.com/.test(href)) {
                return `<a href="${href}" title="${title || text}" ${styles('wx_link')}>${parsedText}</a>`;
            }
            if (href === text) return parsedText;
            if (opts.citeStatus) {
                const ref = addFootnote(title || text, href);
                return `<span ${styles('link')}>${parsedText}<sup>[${ref}]</sup></span>`;
            }
            return styledContent('link', parsedText, 'span');
        },
        strong({ tokens }: Tokens.Strong): string {
            return styledContent('strong', this.parser.parseInline(tokens));
        },
        em({ tokens }: Tokens.Em): string {
            return styledContent('em', this.parser.parseInline(tokens));
        },
        table({ header, rows }: Tokens.Table): string {
            const headerRow = header.map(cell => styledContent('th', this.parser.parseInline(cell.tokens))).join('');
            const body = rows.map(row => styledContent('tr', row.map(cell => this.parser.parse([cell])).join(''))).join('');
            return `<section style="padding:0 8px; max-width: 100%; overflow: auto"><table class="preview-table"><thead ${styles('thead')}>${headerRow}</thead><tbody>${body}</tbody></table></section>`;
        },
        tablecell(token: Tokens.TableCell): string {
            return styledContent('td', this.parser.parseInline(token.tokens));
        },
        hr(_: Tokens.Hr): string {
            return styledContent('hr', '');
        },
    };

    marked.use({ renderer });
    marked.use(markedToc());
    marked.use(markedFootnotes());
    marked.use(markedPlantUML({ inlineSvg: true }));
    
    // These are initialized here and updated in setOptions
    marked.use(markedAlert({ styles: styleMapping }));
    marked.use(markedSlider({ styles: styleMapping }));
    marked.use(MDKatex({ nonStandard: true }, styles('inline_katex', ';vertical-align: middle; line-height: 1;'), styles('block_katex', ';text-align: center;'))); 

    return {
        buildAddition,
        buildFootnotes,
        setOptions,
        reset,
        parseFrontMatterAndContent,
        buildReadingTime,
        createContainer: (content: string) => styledContent('container', content, 'section'),
        getOpts,
    };
}


// --- The main class that ties everything together ---

export class WechatRenderer {
    private rendererAPI: RendererAPI;
    private options: IOpts;

    constructor(options: IOpts) {
        this.options = options;
        this.rendererAPI = initRenderer(this.options);
    }

    setOptions(newOpts: Partial<IOpts>) {
        this.options = { ...this.options, ...newOpts };
        this.rendererAPI.setOptions(this.options);
    }

    render(markdownContent: string): string {
        this.rendererAPI.reset(this.options);
        const { markdownContent: content, readingTime } = this.rendererAPI.parseFrontMatterAndContent(markdownContent);
        
        let html = marked.parse(content);

        html = this.rendererAPI.buildReadingTime(readingTime) + html;
        html += this.rendererAPI.buildFootnotes();
        html = this.rendererAPI.createContainer(html);
        html += this.rendererAPI.buildAddition();

        return html;
    }

    getHtmlForCopy(markdownContent: string, cssContent: string): string {
        const renderedHtml = this.render(markdownContent);
        
        const juicedHtml = juice(renderedHtml, {
            extraCss: cssContent,
            removeStyleTags: true, // Remove <style> tags after inlining
            applyStyleTags: true,
        });

        return juicedHtml;
    }
}