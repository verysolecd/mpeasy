import { App, TFile } from 'obsidian';
import { resolveImagePath } from './image-handler';

/**
 * A centralized function to parse all relevant frontmatter data from a file.
 * @param app The Obsidian App instance.
 * @param file The file to get the frontmatter from.
 * @returns An object containing all extracted frontmatter fields.
 */
export function getFrontmatterData(app: App, file: TFile) {
    const fileCache = app.metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter || {};

    // --- Cover Image ---
    const coverPath = frontmatter?.cover ? String(frontmatter.cover).trim() : null;
    let coverImage: TFile | string | null = 'use_default_banner_setting'; // Default signal

    if (coverPath) {
        if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
            coverImage = coverPath;
        } else {
            const resolvedImage = resolveImagePath(app, coverPath, file.path);
            if (resolvedImage) {
                coverImage = resolvedImage;
            } else {
                console.warn(`MPEasy: Could not find the cover image "${coverPath}" from frontmatter for "${file.path}".`);
                coverImage = null; // Specified but not found
            }
        }
    }

    // --- Other Fields ---
    const author = frontmatter?.author ? String(frontmatter.author) : null;
    const abstract = frontmatter?.abstract ? String(frontmatter.abstract) : null;
    const epigraph = frontmatter?.epigraph ? String(frontmatter.epigraph) : null;


    return {
        coverImage,
        author,
        abstract,
        epigraph,
    };
}