import { App } from 'obsidian';
import { themeOptions } from '../utils/config/configs/theme';

// Placeholder for getLayoutThemes
export async function getLayoutThemes(app: App): Promise<{ name: string; path: string }[]> {
    return themeOptions.map(option => ({
        name: option.label,
        path: option.value,
    }));
}

export async function getCodeBlockThemes(app: App): Promise<{ name: string; path: string }[]> {
    const plugin = app.plugins.getPlugin('mpeasy');
    if (!plugin) {
        console.error('MPEasy plugin not found.');
        return [];
    }
    const pluginDir = plugin.manifest.dir;
    const codestyleDir = `${pluginDir}/assets/codestyle`;

    try {
        const list = await app.vault.adapter.list(codestyleDir);
        return list.files
            .filter(file => file.endsWith('.css'))
            .map(file => {
                const name = file.split('/').pop()?.replace('.css', '') || '';
                return { name, path: file };
            });
    } catch (error) {
        console.error(`Error reading code block themes from ${codestyleDir}:`, error);
        return [];
    }
}

// Placeholder for getCustomStyles
export async function getCustomStyles(app: App): Promise<{ name: string; path: string; content?: string }[]> {
    console.warn("getCustomStyles: Placeholder function called. Implement actual logic.");
    return [
        { name: 'none', path: 'none' },
        { name: 'my-custom-style', path: 'my-custom-style' },
    ];
}
