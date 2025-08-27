import { App } from 'obsidian';
import juice from 'juice';
import type { IOpts } from './types';
import { MPEasySettings } from './sets/settings';

// Note: Much of the original content of this file was related to a legacy
// inline-style generation system and has been removed as part of a major
// refactoring to a CSS class-based, file-driven theme system.

// 缓存正则表达式
const wikilinkImageRegex = /!\[\[(.*?)\]\]/g;

export function preprocessMarkdown(markdown: string): string {
    return markdown.replace(wikilinkImageRegex, '![]($1)');
}

// 缓存主题结果
const themeCache = new Map<string, Promise<{ name: string; path: string }[]>>();

async function getThemes(app: App, themeFolder: 'less' | 'codestyle'): Promise<{ name: string; path: string }[]> {
    const cacheKey = `${app.vault.configDir}/plugins/obsidian-mpeasy/assets/${themeFolder}`;
    
    if (themeCache.has(cacheKey)) {
        return themeCache.get(cacheKey)!;
    }
    
    const themePromise = (async () => {
        try {
            const files = await app.vault.adapter.list(cacheKey);
            const themes: { name: string; path: string }[] = [];
            
            const fileExtension = themeFolder === 'less' ? '.less' : '.css';

            // 并行读取所有文件
            const readPromises = files.files
                .filter(file => file.endsWith(fileExtension) && !file.endsWith(`.min${fileExtension}`))
                .map(async (filePath) => {
                    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
                    const themePath = fileName.replace(fileExtension, '');
                    const fileContent = await app.vault.adapter.read(filePath);
                    const match = fileContent.match(/\/\*\s*#theme name:\s*(.*?)\s*\*\//);
                    const themeName = match ? match[1] : themePath;
                    return { name: themeName, path: themePath };
                });

            const results = await Promise.all(readPromises);
            themes.push(...results);
            
            // Add a default option
            themes.unshift({ name: '默认', path: 'default' });
            
            return themes;
        } catch (error) {
            console.error(`Failed to read themes from assets/${themeFolder}:`, error);
            return [{ name: '默认', path: 'default' }]; // Fallback
        }
    })();
    
    themeCache.set(cacheKey, themePromise);
    return themePromise;
}


/**
 * Dynamically reads the available layout themes from the assets/theme directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of theme objects.
 */
export async function getLayoutThemes(app: App): Promise<{ name: string; path: string }[]> {
    return getThemes(app, 'less');
}

/**
 * Dynamically reads the available code block themes from the assets/codestyle directory.
 * @param app - The Obsidian App instance, used to access the vault.
 * @returns A promise that resolves to an array of theme objects.
 */
export async function getCodeBlockThemes(app: App): Promise<{ name: string; path: string }[]> {
    return getThemes(app, 'codestyle');
}



// 缓存正则表达式
const variableRegex = /var\((--[\w-]+)(?:,\s*([^)]+))?\)/g;
const rootVarRegex = /:root\s*\{([^}]+)\}/g;
const cssVarRegex = /--[\w-]+:\s*([^;]+)/g;

export function resolveCssVariables(css: string, settings: Partial<MPEasySettings>): string {
    const variables: { [key: string]: string } = {};

    // 一次性提取所有变量定义
    let match;
    while ((match = rootVarRegex.exec(css)) !== null) {
        const rootVars = match[1];
        let varMatch;
        while ((varMatch = cssVarRegex.exec(rootVars)) !== null) {
            variables[varMatch[1]] = varMatch[2].trim();
        }
    }

    // 应用设置覆盖
    if (settings.primaryColor) {
        variables['--mpe-primary-color'] = settings.primaryColor;
    }
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