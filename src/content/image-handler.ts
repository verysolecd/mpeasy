import { App, TFile } from 'obsidian';

/**
 * A unified function to resolve various image path formats within Obsidian.
 * Handles:
 * 1. Quoted paths (single or double)
 * 2. Wikilinks ([[image.png]])
 * 3. URL encoded paths (%20)
 * 4. Standard Obsidian relative/absolute paths
 * 5. Obsidian's internal app:// URIs
 * 6. Markdown syntax like `![](path)` or `[](path)`
 *
 * @param app The Obsidian App instance.
 * @param imagePath The raw path to the image from frontmatter or HTML src.
 * @param sourceFilePath The path of the markdown file containing the link, used as a base for relative paths.
 * @returns A TFile object if the image is found in the vault, otherwise null.
 */
export function resolveImagePath(app: App, imagePath: string, sourceFilePath: string): TFile | null {
    if (!imagePath) {
        return null;
    }

    let cleanPath = imagePath.trim();

    // Handle markdown image/link syntax: ![alt](src) or [text](src)
    const markdownMatch = /^(?:!\[.*?\]|\[.*?\])\((.*?)\)$/.exec(cleanPath);
    if (markdownMatch) {
        cleanPath = markdownMatch[1].trim();
    }
    
    // Handle web URLs - if it's a URL, we can't resolve it to a local TFile.
    // The existing logic in `getCoverImage` will handle it.
    if (/^(https?:\/\/|www\.)/i.test(cleanPath.replace(/\\/g, '/'))) {
        return null;
    }

    // Handle Obsidian's internal app:// URI first, as it's a full identifier
    if (cleanPath.startsWith('app://')) {
        try {
            // The most reliable part of the app:// URI is the filename.
            const pathWithoutQuery = cleanPath.split('?')[0];
            const lastSlashIndex = pathWithoutQuery.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                cleanPath = pathWithoutQuery.substring(lastSlashIndex + 1);
            }
        } catch (e) {
            console.error('MPEasy: Failed to parse app:// URL', e);
        }
    }

    // Handle quoted paths (common in frontmatter)
    if ((cleanPath.startsWith("'") && cleanPath.endsWith("'")) || (cleanPath.startsWith('"') && cleanPath.endsWith('"'))) {
        cleanPath = cleanPath.substring(1, cleanPath.length - 1);
    }

    // Handle wikilinks
    if (cleanPath.startsWith('[[') && cleanPath.endsWith(']]')) {
        cleanPath = cleanPath.substring(2, cleanPath.length - 2);
    }

    // Decode URL-encoded characters like %20 and replace backslashes
    try {
        cleanPath = decodeURIComponent(cleanPath.replace(/\\/g, '/'));
    } catch (e) {
        // Ignore decoding errors, proceed with the path as is
        console.warn(`MPEasy: Failed to decode URI component: ${cleanPath}`);
    }

    // Resolve the path using Obsidian's metadata cache
    // This is the most reliable way to find a file by its link text or relative path
    const imageFile = app.metadataCache.getFirstLinkpathDest(cleanPath, sourceFilePath);

    if (imageFile instanceof TFile) {
        return imageFile;
    }

    return null;
}
