import { App, TFile } from 'obsidian';

export function getCoverImagePath(app: App, file: TFile): string {
    const fileCache = app.metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter;

    if (frontmatter && frontmatter.cover) {
        return frontmatter.cover;
    }

    // Return a special key for the default banner
    return 'default_banner';
}
