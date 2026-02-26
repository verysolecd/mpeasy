import juice from 'juice';
import MPEasyPlugin from '../core/main';

async function getCssRules(plugin: MPEasyPlugin): Promise<string> {
    let css = '';
    const { styleSettings } = plugin.settings;

    // 1. Read base styles (styles.css)
    // The build script copies UIstyle.css from src/core/components/UIstyle.css to the plugin's root directory as styles.css.
    const basePath = `${plugin.manifest.dir}/styles.css`;
    try {
        const baseCss = await plugin.app.vault.adapter.read(basePath);
        css += baseCss;
    } catch (err) {
        console.error(`MPEasy: Failed to read base styles at ${basePath}`, err);
    }

    // 2. Read code highlight theme
    if (styleSettings.codeThemeName && styleSettings.codeThemeName !== 'none') {
        try {
            // MPEasyView just reads this path directly, so we trust it's a valid vault path.
            const codeThemeCss = await plugin.app.vault.adapter.read(styleSettings.codeThemeName);
            css += codeThemeCss;
        } catch (err) {
            console.error(`MPEasy: Error loading code theme ${styleSettings.codeThemeName}:`, err);
        }
    }

    // 3. Read custom CSS
    if (styleSettings.useCustomCSS && styleSettings.customStyleName && styleSettings.customStyleName !== 'none') {
        try {
            const customCss = await plugin.app.vault.adapter.read(styleSettings.customStyleName);
            css += customCss;
        } catch (err) {
            console.error("MPEasy: Error loading custom CSS", err);
        }
    }

    // 4. Force reset mobile text size adjustment to prevent font scaling on mobile WeChat
    css += `\n * { -webkit-text-size-adjust: 100% !important; } \n`;

    return css;
}

export async function inlineStyles(html: string, plugin: MPEasyPlugin): Promise<string> {
    if (!plugin) {
        return html; // Don't process if plugin is not available
    }

    const css = await getCssRules(plugin);

    // Use Juice to inline the collected CSS
    // The HTML from the renderer already has inline styles for the theme.
    // This will add the styles for code blocks and custom CSS.
    const inlinedHtml = juice(html, {
        extraCss: css,
        removeStyleTags: true, // Remove any <style> tags from the input HTML
        applyStyleTags: true,  // Apply any <style> tags from the input HTML before removing them
    });

    return inlinedHtml;
}