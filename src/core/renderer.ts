import type { RendererObject, MarkedExtension, PropertiesHyphen } from 'marked';
import { Marked } from 'marked';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import type { IOpts, RendererAPI, Theme, ThemeStyles, Block, Inline } from '../types';
import { customCssWithTemplate, css2json } from '../utils';
import { cloneDeep, toMerged } from 'es-toolkit';

import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';

const fallbackTheme: Theme = {
    name: 'fallback',
    base: {},
    inline: {},
    block: {},
    styles: {},
};

export function getStyleString(style: PropertiesHyphen): string {
    if (!style) return '';
    return Object.entries(style)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');
}

function buildThemeStyles(theme: Theme, opts: Partial<IOpts>): ThemeStyles {
    const themeCopy = cloneDeep(theme);
    const base = toMerged(themeCopy.base, {
        'font-family': opts.fonts,
        'font-size': opts.size,
    });

    if (opts.isUseIndent) {
        themeCopy.block.p = {
            'text-indent': `2em`,
            ...themeCopy.block.p,
        };
    }

    const mergeStyles = (styles: Record<string, PropertiesHyphen>): Record<string, any> =>
        Object.fromEntries(
            Object.entries(styles || {}).map(([ele, style]) => [ele, toMerged(base, style)])
        );

    return {
        ...mergeStyles(themeCopy.inline),
        ...mergeStyles(themeCopy.block),
    } as ThemeStyles;
}

export function initRenderer(options: IOpts, iframeWindow: Window): RendererAPI {
    let opts = options;
    let localMarked: Marked;

    const createMarkedInstance = (currentOpts: IOpts) => {
        const processedTheme = customCssWithTemplate(
            css2json(currentOpts.customCSS || ''),
            currentOpts.primaryColor || '#000000',
            currentOpts.theme || fallbackTheme
        );

        processedTheme.styles = buildThemeStyles(processedTheme, currentOpts, currentOpts.fonts, currentOpts.size);

        const renderer: RendererObject = {
            code(code, language) {
                if (language === 'mermaid') {
                    return `<div class="mermaid">${code}</div>`;
                }
                const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
                const stringCode = String(code || '');
                const highlightedCode = hljs.highlight(stringCode, { language: validLanguage || 'plaintext' }).value;
                return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
            },
        };

        const extensions: MarkedExtension[] = [
            markedAlert({ styles: processedTheme.styles }),
            markedFootnotes(),
            MDKatex({}, getStyleString(processedTheme.styles.inline?.code), getStyleString(processedTheme.styles.block?.code), iframeWindow),
            markedSlider({ styles: processedTheme.styles }),
            markedToc(),
        ];

        return new Marked({
            renderer,
            extensions,
            breaks: true,
            gfm: true,
        });
    };

    localMarked = createMarkedInstance(opts);

    function setOptions(newOpts: Partial<IOpts>) {
        opts = { ...opts, ...newOpts };
        localMarked = createMarkedInstance(opts);
    }

    function parse(markdown: string): string {
        return localMarked.parse(markdown) as string;
    }

    function parseFrontMatterAndContent(content: string) {
        const { attributes, body } = frontMatter(content);
        return { frontMatter: attributes, markdownContent: body };
    }

    return {
        parse,
        parseFrontMatterAndContent,
        setOptions,
    };
}
