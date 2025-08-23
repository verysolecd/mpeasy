
import { MarkdownRenderer, TFile } from 'obsidian';
import juice from 'juice';
import { marked } from 'marked';
import { themeMap } from './theme';
import { IOpts } from '../types';
import MPEasyPlugin from '../../main';

// Assuming refmd's CSS is located at this path
// TODO: Confirm the actual path to the theme files
const REFMD_THEME_PATH = 'path/to/refmd/theme.css';

export class RendererService {
    private plugin: MPEasyPlugin;

    constructor(plugin: MPEasyPlugin) {
        this.plugin = plugin;
        this.initializeMarked();
    }

    private initializeMarked() {
        // Configure marked exactly like in refmd
        // This is a placeholder for the actual configuration
        marked.setOptions({
            // refmd's marked options here
        });
    }

    /**
     * Pipeline 1: Renders Markdown for the Obsidian preview pane.
     * Uses Obsidian's native renderer for performance and consistency,
     * and injects refmd's styles.
     */
    async renderForPreview(markdown: string, container: HTMLElement) {
        // Use a fragment to avoid manipulating the DOM directly too early
        const contentFragment = document.createDocumentFragment();
        const tempDiv = contentFragment.createDiv();

        // 1. Use Obsidian's native renderer
        await MarkdownRenderer.render(this.plugin.app, markdown, tempDiv, '', this.plugin);

        // 2. Inject refmd theme styles
        const styleEl = document.createElement('style');
        // styleEl.textContent = this.getThemeCss(); // Load the theme CSS
        container.appendChild(styleEl);
        
        // 3. Append the rendered content
        container.appendChild(tempDiv);

        // 4. Post-process for dynamic elements if necessary (e.g., Mermaid)
        this.handleDynamicElements(container);
    }

    /**
     * Pipeline 2: Renders Markdown to HTML for copying to WeChat.
     * This is a pure replication of the refmd rendering process.
     */
    async renderForWeChat(markdown: string, opts: IOpts): Promise<string> {
        // 1. Generate pure HTML using the refmd-configured marked instance
        const pureHtml = marked(markdown);

        // 2. Load the selected refmd theme CSS
        const themeCss = this.getThemeCss(opts.layoutThemeName);

        // 3. Inline the CSS using juice
        const finalHtml = juice(pureHtml, { extraCss: themeCss });

        // 4. Handle image uploads and path replacements (existing logic)
        // const processedHtml = await this.handleImages(finalHtml);

        return finalHtml;
    }

    private getThemeCss(themeName: string): string {
        const theme = themeMap[themeName as keyof typeof themeMap] || themeMap.default;
        let fullStyle = '';

        const styleObjectToString = (style: Record<string, string>): string => {
            return Object.entries(style).map(([key, value]) => `${key}: ${value}`).join(';');
        }

        // Base styles
        fullStyle += `section { ${styleObjectToString(theme.base)} }
`;

        // Block styles
        for (const key in theme.block) {
            if (Object.prototype.hasOwnProperty.call(theme.block, key)) {
                fullStyle += `${key} { ${styleObjectToString(theme.block[key as keyof typeof theme.block])} }
`;
            }
        }

        // Inline styles
        for (const key in theme.inline) {
            if (Object.prototype.hasOwnProperty.call(theme.inline, key)) {
                 fullStyle += `${key} { ${styleObjectToString(theme.inline[key as keyof typeof theme.inline])} }
`;
            }
        }
        return fullStyle;
    }

    private handleDynamicElements(container: HTMLElement) {
        // Placeholder for handling elements like Mermaid diagrams
        // that Obsidian's renderer might not handle out-of-the-box.
    }

    // It's better to keep the image handling logic separate
    // and call it after the rendering is complete.
    // private async handleImages(html: string): Promise<string> {
    //     // Existing image upload and path replacement logic goes here
    //     return html;
    // }
}
