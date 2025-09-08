import { App } from 'obsidian';

// Placeholder for getLayoutThemes
export async function getLayoutThemes(app: App): Promise<{ name: string; path: string }[]> {
    console.warn("getLayoutThemes: Placeholder function called. Implement actual logic.");
    return [
        { name: 'minimal', path: 'minimal' },
        { name: 'custom-layout-theme', path: 'custom-layout-theme' },
    ];
}

// Placeholder for getCodeBlockThemes
export async function getCodeBlockThemes(app: App): Promise<{ name: string; path: string }[]> {
    console.warn("getCodeBlockThemes: Placeholder function called. Implement actual logic.");
    return [
        { name: 'atom-one-dark', path: 'atom-one-dark' },
        { name: 'github-light', path: 'github-light' },
    ];
}

// Placeholder for getCustomStyles
export async function getCustomStyles(app: App): Promise<{ name: string; path: string; content?: string }[]> {
    console.warn("getCustomStyles: Placeholder function called. Implement actual logic.");
    return [
        { name: 'none', path: 'none' },
        { name: 'my-custom-style', path: 'my-custom-style' },
    ];
}
