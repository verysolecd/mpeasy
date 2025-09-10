import { App, TFile } from 'obsidian';

/**
 * Resolves an image path within the Obsidian vault.
 * @param app The Obsidian App instance.
 * @param imagePath The path to the image.
 * @param sourcePath The path of the file containing the image link.
 * @returns The TFile object if found, otherwise null.
 */
export function resolveObsidianPath(app: App, imagePath: string, sourcePath: string): TFile | null {
    const decodedPath = decodeURIComponent(imagePath);
    const imageFile = app.metadataCache.getFirstLinkpathDest(decodedPath, sourcePath);

    if (imageFile instanceof TFile) {
        return imageFile;
    }

    console.warn(`MPEasy: Could not resolve path: ${decodedPath}`);
    return null;
}