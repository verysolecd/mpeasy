import { App } from 'obsidian';
import juice from 'juice';
import type { IOpts } from './types';

// Note: Much of the original content of this file was related to a legacy
// inline-style generation system and has been removed as part of a major
// refactoring to a CSS class-based, file-driven theme system.

export function preprocessMarkdown(markdown: string): string {
    // This regex finds all occurrences of ![[...]]
    const wikilinkImageRegex = /!\[\[(.*?)\]\]/g;
    return markdown.replace(wikilinkImageRegex, '[]($1)');
}

async function getThemes(app: App, themeFolder: 'theme' | 'codestyle'): Promise<{ name: string; path: string }[]> {
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
 * Dynamically reads the available code block themes from the assets/codestyle directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of theme objects.
 */
export async function getCodeBlockThemes(app: App): Promise<{ name: string; path: string }[]> {
    return getThemes(app, 'codestyle');
}

/**
 * Dynamically reads the available custom styles from the assets/style directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of style objects.
 */
export async function getCustomStyles(app: App): Promise<{ name: string; path: string }[]> {
    const styleDir = `${app.vault.configDir}/plugins/mpeasy/assets/style`;
    try {
        const files = await app.vault.adapter.list(styleDir);
        const stylePromises = files.files
            .filter(file => file.endsWith('.css') && !file.endsWith('.min.css'))
            .map(async (filePath) => {
                const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
                const stylePath = fileName.replace('.css', '');
                const fileContent = await app.vault.adapter.read(filePath);
                const match = fileContent.match(/\/\*\s*#name:\s*(.*?)\s*\*\//);
                const styleName = match ? match[1] : stylePath;
                return { name: styleName, path: stylePath };
            });

        const styles = await Promise.all(stylePromises);
        styles.unshift({ name: '无', path: 'none' });
        return styles;
    } catch (error) {
        console.error(`Failed to read styles from assets/style:`, error);
        return [{ name: '无', path: 'none' }]; // Fallback
    }
}

export function resolveCssVariables(css: string, opts: Partial<IOpts>): string {
    const variableRegex = /var\((--[\w-]+)(?:,\s*(.+))?\)/g;
    const rootVarRegex = /:root\s*\{([^}]+)\}/g;
    let variables: { [key: string]: string } = {};

    // Extract variables from :root
    let rootMatch;
    while ((rootMatch = rootVarRegex.exec(css)) !== null) {
        const rootVars = rootMatch[1];
        const varDeclarations = rootVars.split(';');
        varDeclarations.forEach(declaration => {
            const parts = declaration.split(':');
            if (parts.length === 2) {
                const name = parts[0].trim();
                const value = parts[1].trim();
                variables[name] = value;
            }
        });
    }

    // Override with opts from settings
    if (opts.primaryColor) {
        variables['--mpe-primary-color'] = opts.primaryColor;
    }

    let resolvedCss = css;
    let iterations = 0;

    while (iterations < 10) {
        let replaced = false;
        resolvedCss = resolvedCss.replace(variableRegex, (match, varName, fallback) => {
            if (variables[varName]) {
                replaced = true;
                return variables[varName];
            }
            if (fallback) {
                replaced = true;
                return fallback;
            }
            return match;
        });

        if (!replaced) {
            break;
        }
        iterations++;
    }

    return resolvedCss;
}

// Simple XOR encryption
function xor(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

export function encrypt(text: string, key: string): string {
    if (!text || !key) {
        return text;
    }
    const xor_encrypted = xor(text, key);
    return btoa(xor_encrypted);
}

export function decrypt(encryptedText: string, key: string): string {
    if (!encryptedText || !key) {
        return encryptedText;
    }
    try {
        const decoded_text = atob(encryptedText);
        return xor(decoded_text, key);
    } catch (e) {
        return encryptedText;
    }
}
