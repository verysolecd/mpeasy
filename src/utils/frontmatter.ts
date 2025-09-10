import { App, TFile } from 'obsidian';
import { resolveObsidianPath } from './imagePathResolver';

/**
 * Gets the cover image specified in the frontmatter.
 * It handles web URLs, quoted paths, and local Obsidian paths.
 * @param app The Obsidian App instance.
 * @param file The file to get the frontmatter from.
 * @returns A TFile object for a local image, a string for a web URL, 
 *          or the string 'default_banner' if not found or not specified.
 */
export function getCoverImage(app: App, file: TFile): TFile | string {
    const fileCache = app.metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter;

    if (!frontmatter || !frontmatter.cover) {
        return 'default_banner';
    }

    let coverPath: string = frontmatter.cover.trim();

    // 1. Check for web URLs
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
        // Note: WeChat requires uploading the image, so a URL might not be directly usable.
        // For now, we return it and the caller can decide how to handle it.
        return coverPath;
    }

    // 2. Handle quoted paths
    if ((coverPath.startsWith("'") && coverPath.endsWith("'")) || (coverPath.startsWith('"') && coverPath.endsWith('"'))) {
        coverPath = coverPath.substring(1, coverPath.length - 1);
    }

    // 3. Resolve local path
    const imageFile = resolveObsidianPath(app, coverPath, file.path);

    if (imageFile) {
        return imageFile;
    }

    // 4. Fallback to default
    console.warn(`MPEasy: Could not find the cover image "${coverPath}" specified in the frontmatter of "${file.path}". Falling back to default banner.`);
    return 'default_banner';
}
