import { App, TFile } from 'obsidian';
import { resolveImagePath } from './image-handler';
import { MPEasySettings } from '../utils/config/types/settings';

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