import { marked } from 'marked';
import { RenderOptions } from '../types';
import hljs from 'highlight.js';
import { sanitize } from 'isomorphic-dompurify';

import { markedAlert } from './extensions/alert';
import { markedKatex } from './extensions/katex';
import { markedFootnotes, markedFootnoteRef } from './extensions/footnotes';

// Import theme CSS as string
import wechatCss from 'css-string:./themes/wechat.css';

export class MarkdownRenderer {
    private markedInstance: marked.Marked;
    private themeStyles: Record<string, Record<string, string>> = {};

    constructor() {
        this.markedInstance = new marked.Marked();

        // Register marked extensions
        this.markedInstance.use(markedAlert);
        this.markedInstance.use(markedKatex);
        this.markedInstance.use(markedFootnotes);
        this.markedInstance.use(markedFootnoteRef);

        // Configure highlight.js
        hljs.configure({ ignoreUnescapedHTML: true });

        // Load themes
        this.loadThemeStyles();
    }

    private loadThemeStyles() {
        // A very basic CSS parser. For production, consider a robust library.
        const parseCss = (cssString: string): Record<string, Record<string, string>> => {
            const styles: Record<string, Record<string, string>> = {};
            const rules = cssString.match(/([^{]+){([^}]+)}/g);

            if (rules) {
                rules.forEach(rule => {
                    const [selectorPart, stylePart] = rule.split(/\{(.+)\}/s).filter(Boolean);
                    const selectors = selectorPart.split(',').map(s => s.trim());
                    const styleProps: Record<string, string> = {};

                    stylePart.split(';').forEach(prop => {
                        const [key, value] = prop.split(':').map(s => s.trim());
                        if (key && value) {
                            styleProps[key] = value;
                        }
                    });

                    selectors.forEach(selector => {
                        // Handle simple selectors for now (e.g., p, h1, .class)
                        // More complex selectors (e.g., p + p, div > p) would need a proper parser
                        const cleanSelector = selector.replace(/\s*\*\s*/g, '').replace(/\s*body\s*,\s*/g, ''); // Basic cleanup
                        if (cleanSelector) {
                            styles[cleanSelector] = { ...styles[cleanSelector], ...styleProps };
                        }
                    });
                });
            }
            return styles;
        };

        // This is where we will load the actual CSS string
                this.themeStyles.wechat = parseCss(wechatCss);
        // Load other themes here
        // Load other themes here
    }

    public render(markdown: string, options: RenderOptions): string {
        console.log('Rendering with options:', options);

        const currentTheme = this.themeStyles[options.theme] || {};

        const getStyle = (selector: string, additionalProps: Record<string, string> = {}): string => {
            const base = currentTheme[selector] || {};
            const combined = { ...base, ...additionalProps };
            return Object.entries(combined).map(([key, value]) => `${key}: ${value}`).join('; ');
        };

        const renderer = new marked.Renderer();

        // --- Custom Renderer Overrides (based on refmd_analysis.md) ---

        renderer.paragraph = (text) => {
            return `<p style="${getStyle('p')}">${text}</p>`;
        };

        renderer.heading = (text, level) => {
            const tag = `h${level}`;
            const fontSize = options.fontSize * (2 - (level - 1) * 0.2); // Simple scaling
            return `<${tag} style="${getStyle(tag, { 'font-size': `${fontSize}px` })}">${text}</${tag}>`;
        };

        renderer.code = (code, lang) => {
            const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
            const highlightedCode = hljs.highlight(code, { language }).value;
            const codeBlockHeader = `<div style="${getStyle('.code-block-header')}">${lang || 'Code'}</div>`;
            return `
                <pre style="${getStyle('pre')}">
                    ${codeBlockHeader}
                    <code class="language-${language}" style="${getStyle('code')}">${highlightedCode}</code>
                </pre>
            `;
        };

        renderer.blockquote = (quote) => {
            return `<blockquote style="${getStyle('blockquote')}">${quote}</blockquote>`;
        };

        renderer.list = (body, ordered, start) => {
            const tag = ordered ? 'ol' : 'ul';
            const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
            return `<${tag} style="${getStyle(tag)}"${startAttr}>${body}</${tag}>`;
        };

        renderer.listitem = (text) => {
            return `<li style="${getStyle('li')}">${text}</li>`;
        };

        renderer.strong = (text) => {
            return `<strong style="${getStyle('strong')}">${text}</strong>`;
        };

        renderer.em = (text) => {
            return `<em style="${getStyle('em')}">${text}</em>`;
        };

        renderer.del = (text) => {
            return `<del style="${getStyle('del')}">${text}</del>`;
        };

        renderer.link = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr} style="${getStyle('a')}">${text}</a>`;
        };

        renderer.image = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            const altAttr = text ? ` alt="${text}"` : '';
            const caption = text ? `<figcaption style="${getStyle('figcaption')}">${text}</figcaption>` : '';
            return `
                <figure style="${getStyle('figure')}">
                    <img src="${href}"${altAttr}${titleAttr} style="${getStyle('img')}" />
                    ${caption}
                </figure>
            `;
        };

        renderer.table = (header, body) => {
            return `
                <table style="${getStyle('table')}">
                    <thead style="${getStyle('thead')}">${header}</thead>
                    <tbody style="${getStyle('tbody')}">${body}</tbody>
                </table>
            `;
        };

        renderer.tablerow = (content) => {
            return `<tr style="${getStyle('tr')}">${content}</tr>`;
        };

        renderer.tablecell = (content, flags) => {
            const tag = flags.header ? 'th' : 'td';
            const align = flags.align ? ` align="${flags.align}"` : '';
            return `<${tag}${align} style="${getStyle(tag)}">${content}</${tag}>`;
        };

        renderer.hr = () => {
            return `<hr style="${getStyle('hr')}" />`;
        };

        renderer.br = () => {
            return `<br style="${getStyle('br')}" />`;
        };

        renderer.html = (html) => {
            // Sanitize HTML to prevent XSS attacks
            return sanitize(html, { USE_PROFILES: { html: true } });
        };

        // --- End Custom Renderer Overrides ---

        const rawHtml = this.markedInstance.parse(markdown, { renderer });

        return rawHtml;
    }

    private buildThemeStyles(options: RenderOptions): Record<string, string> {
        const currentTheme = this.themeStyles[options.theme] || {};
        const finalStyles: Record<string, string> = {};

        for (const selector in currentTheme) {
            const props = currentTheme[selector];
            let styleString = '';
            for (const key in props) {
                let value = props[key];
                // Apply dynamic options
                if (key === 'font-size') {
                    if (selector === 'p') {
                        value = `${options.fontSize}px`;
                    } else if (selector.match(/^h[1-6]$/)) {
                        const level = parseInt(selector.substring(1));
                        value = `${options.fontSize * (2 - (level - 1) * 0.2)}px`;
                    }
                } else if (key === 'font-family') {
                    value = options.fontFamily;
                } else if (key === 'line-height') {
                    value = `${options.lineHeight}`; // Line height is unitless or em
                } else if (key === 'margin-bottom' && selector === 'p') {
                    value = `${options.paragraphSpacing}em`;
                }
                styleString += `${key}: ${value}; `;
            }
            finalStyles[selector] = styleString.trim();
        }

        // Special handling for .code-block-header which is a class
        if (currentTheme['.code-block-header']) {
            finalStyles['.code-block-header'] = Object.entries(currentTheme['.code-block-header'])
                .map(([key, value]) => `${key}: ${value}`).join('; ');
        }

        return finalStyles;
    }
}