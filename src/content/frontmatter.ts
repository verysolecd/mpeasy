import { App, TFile } from 'obsidian';
import { resolveImagePath } from './image-handler';
import { MPEasySettings } from '../utils/config/types/settings';
import MPEasyPlugin from '../main';


/**
 * Gets the cover image specified in the frontmatter.
 * It handles web URLs and all local Obsidian path formats via resolveImagePath.
 * @param app The Obsidian App instance.
 * @param file The file to get the frontmatter from.
 * @returns A TFile object for a local image, a string for a web URL, 
 *          the string 'use_default_banner_setting' if not specified in frontmatter,
 *          or null if specified but not found.
 */
export function getCoverImage(app: App, file: TFile): TFile | string | null {
    const fileCache = app.metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter;

    const coverPath = frontmatter?.cover ? String(frontmatter.cover).trim() : null;

    // 1. If cover is not specified in frontmatter, signal to use the default.
    if (!coverPath) {
        return 'use_default_banner_setting';
    }

    // 2. If specified, process the path.
    
    // A. Check for web URLs
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
        return coverPath;
    }

    // B. Resolve any other path format using the unified resolver
    const imageFile = resolveImagePath(app, coverPath, file.path);

    if (imageFile) {
        return imageFile;
    }

    // C. Fallback: Specified in frontmatter but not found
    console.warn(`MPEasy: Could not find the cover image "${coverPath}" from frontmatter for "${file.path}".`);
    return null;
}


/**
 * Injects header and footer content from a template file into the rendered HTML.
 * @param html The original HTML content.
 * @param plugin The MPEasyPlugin instance.
 * @returns A promise that resolves with the modified HTML.
 */
export async function injectFrontmatter(html: string, plugin: MPEasyPlugin, file: TFile): Promise<string> {
    if (!plugin.settings.enableFrontmatterInjection) {
        return html;
    }

    try {
        // Get frontmatter from the active file
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        const frontmatter = fileCache?.frontmatter;

        // Determine the epigraph
        const epigraph = frontmatter?.epigraph || plugin.settings.epigraph;

        // 1. Read the template HTML file
        const frontalPath = `${plugin.manifest.dir}/assets/frontal.md`;
        let frontalHtml = await plugin.app.vault.adapter.read(frontalPath);

        // Replace the placeholder
        frontalHtml = frontalHtml.replace('{{this}}', epigraph);

        // 2. Parse the template HTML and extract sections
        const parser = new DOMParser();
        const frontalDoc = parser.parseFromString(frontalHtml, 'text/html');
        const sections = Array.from(frontalDoc.body.children).filter(el => el.tagName === 'SECTION') as HTMLElement[];
        
        const headerContent = sections.slice(0, 2).map(s => s.outerHTML).join('');
        const footerContent = sections.length > 2 ? sections[2].outerHTML : '';

        // 3. Parse the main HTML and inject the content
        const mainDoc = parser.parseFromString(html, 'text/html');
        const body = mainDoc.body;

        // Inject header after the word count blockquote
        if (headerContent) {
            const wordCountEl = body.querySelector('blockquote');
            if (wordCountEl) {
                wordCountEl.insertAdjacentHTML('afterend', headerContent);
            } else {
                // Fallback: inject at the beginning if word count is not found
                body.insertAdjacentHTML('afterbegin', headerContent);
            }
        }

        // Inject footer at the end
        if (footerContent) {
            body.insertAdjacentHTML('beforeend', footerContent);
        }

        return mainDoc.body.innerHTML;

    } catch (error) {
        console.error("MPEasy: Failed to inject frontmatter.", error);
        // Return original HTML on failure to avoid breaking the preview
        return html;
    }
}