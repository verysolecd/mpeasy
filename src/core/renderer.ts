import { Marked } from 'marked';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import juice from 'juice';
import type { IOpts, RendererAPI } from '../types';
import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';
import { katexCSS } from './katex.css';
import { loadLayoutTheme, loadCodeBlockTheme } from '../utils';

export function initRenderer(options: IOpts, iframeWindow: Window): RendererAPI {
    let opts = options;
    let localMarked: Marked;

    const createMarkedInstance = (currentOpts: IOpts) => {
        const renderer = {
            code(code: string, language: string) {
                const codeString = typeof code === 'string' ? code : '';
                const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                const highlightedCode = hljs.highlight(codeString, { language: validLanguage }).value;
                return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
            },
        };

        const extensions = [
            markedAlert(),
            markedFootnotes(),
            MDKatex(),
            markedSlider(),
            markedToc(),
        ];

        return new Marked({ renderer, extensions, breaks: true, gfm: true });
    };

    localMarked = createMarkedInstance(opts);

    function setOptions(newOpts: Partial<IOpts>) {
        opts = { ...opts, ...newOpts };
        localMarked = createMarkedInstance(opts);
    }

    async function parse(markdown: string): Promise<string> {
        const layoutThemeCss = loadLayoutTheme(opts.layoutThemeName);
        const codeBlockThemeCss = loadCodeBlockTheme(opts.codeThemeName);

        // Combine all styles into a single style block
        const fullCss = `
<style>
${layoutThemeCss}
${codeBlockThemeCss}
${katexCSS}
</style>
`;

        let html = localMarked.parse(markdown) as string;
        
        // Prepend the main class and styles to the HTML
        const contentToJuice = `${fullCss}<div class="note-to-mp">${html}</div>`;

        // Inline all styles
        const inlinedHtml = juice(contentToJuice);
        
        return inlinedHtml;
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