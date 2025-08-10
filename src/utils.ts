import { App } from 'obsidian';
import juice from 'juice';

// Note: Much of the original content of this file was related to a legacy
// inline-style generation system and has been removed as part of a major
// refactoring to a CSS class-based, file-driven theme system.

async function getThemes(app: App, themeFolder: 'theme' | 'style'): Promise<{ name: string; path: string }[]> {
    const themeDir = `${app.vault.configDir}/plugins/mpeasy/assets/${themeFolder}`;
    try {
        const files = await app.vault.adapter.list(themeDir);
        const themePromises = files.files
            .filter(file => file.endsWith('.css') && !file.endsWith('.min.css'))
            .map(async (filePath) => {
                const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
                const themePath = fileName.replace('.css', '');
                const fileContent = await app.vault.adapter.read(filePath);
                const match = fileContent.match(/\/\*\s*#theme name:\s*(.*?)\s*\*\//);
                const themeName = match ? match[1] : themePath;
                return { name: themeName, path: themePath };
            });

        const themes = await Promise.all(themePromises);
        // Add a default option
        if (themeFolder === 'theme') {
            themes.unshift({ name: '默认', path: 'default' });
        }
        return themes;
    } catch (error) {
        console.error(`Failed to read themes from assets/${themeFolder}:`, error);
        return [{ name: '默认', path: 'default' }]; // Fallback
    }
}


/**
 * Dynamically reads the available layout themes from the assets/theme directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of theme objects.
 */
export async function getLayoutThemes(app: App): Promise<{ name: string; path: string }[]> {
    return getThemes(app, 'theme');
}

/**
 * Dynamically reads the available code block themes from the assets/style directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of theme objects.
 */
export async function getCodeBlockThemes(app: App): Promise<{ name: string; path: string }[]> {
    return getThemes(app, 'style');
}


function solveWeChatImage(clipboardDiv: HTMLElement) {
    const images = clipboardDiv.getElementsByTagName('img');

    Array.from(images).forEach((image) => {
        const width = image.getAttribute('width')!;
        const height = image.getAttribute('height')!;
        image.removeAttribute('width');
        image.removeAttribute('height');
        image.style.width = width;
        image.style.height = height;
    });
}

function mergeCss(html: string, allCss: string): string {
    return juice(
        `<style>${allCss}</style>${html}`, 
        {
            inlinePseudoElements: true,
            preserveImportant: true,
        }
    );
}

function modifyHtmlStructure(htmlString: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // 移动 `li > ul` 和 `li > ol` 到 `li` 后面
    tempDiv.querySelectorAll('li > ul, li > ol').forEach((originalItem) => {
        originalItem.parentElement!.insertAdjacentElement('afterend', originalItem);
    });

    return tempDiv.innerHTML;
}

function createEmptyNode(): HTMLElement {
    const node = document.createElement('p');
    node.style.fontSize = '0';
    node.style.lineHeight = '0';
    node.style.margin = '0';
    node.innerHTML = '&nbsp;';
    return node;
}

export function processClipboardContent(
    originalHtml: string, 
    primaryColor: string, 
    allCss: string
): string {
    
    // Use a temporary div to process the HTML
    const clipboardDiv = document.createElement('div');
    clipboardDiv.innerHTML = originalHtml;

    // First, inline the CSS
    let html = mergeCss(clipboardDiv.innerHTML, allCss);
    
    // Then, modify the structure
    html = modifyHtmlStructure(html);

    // Update the div with the modified HTML to perform DOM operations
    clipboardDiv.innerHTML = html;

    // Post-processing steps from onlyref
    clipboardDiv.innerHTML = clipboardDiv.innerHTML
        .replace(/([^-])top:(.*?)em/g, '$1transform: translateY($2em)')
        .replace(/hsl\(var\(--foreground\)\)/g, '#3f3f3f')
        .replace(/var\(--blockquote-background\)/g, '#f7f7f7')
        .replace(/var\(--md-primary-color\)/g, primaryColor)
        .replace(
            /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
            '<span class="nodeLabel"$1>$2</span>',
        )
        .replace(
            /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
            '<span class="edgeLabel"$1>$2</span>',
        );

    solveWeChatImage(clipboardDiv);

    const beforeNode = createEmptyNode();
    const afterNode = createEmptyNode();
    clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild);
    clipboardDiv.appendChild(afterNode);

    // Mermaid compatibility
    const nodes = clipboardDiv.querySelectorAll('.nodeLabel');
    nodes.forEach((node) => {
        const parent = node.parentElement!;
        if (parent) {
            const xmlns = parent.getAttribute('xmlns')!;
            const style = parent.getAttribute('style')!;
            const section = document.createElement('section');
            if (xmlns) section.setAttribute('xmlns', xmlns);
            if (style) section.setAttribute('style', style);
            section.innerHTML = parent.innerHTML;

            const grand = parent.parentElement!;
            if (grand) {
                grand.innerHTML = '';
                grand.appendChild(section);
            }
        }
    });

    return clipboardDiv.outerHTML;
}
