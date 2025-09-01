
import React, { useState, useEffect, useMemo } from 'react';
import ShadowView from './components/ShadowView';
import StylePanel from './components/StylePanel';
import { Notice } from 'obsidian';
import { WechatRenderer } from './utils/WechatRenderer';
import { themeMap } from './utils/themes';

interface AppProps {
  fileContent: string;
  cssContent: string;
  availableCodeThemes: string[];
  getCodeThemeUrl: (themeFile: string) => string;
  getCodeThemeCss: (themeFile: string) => Promise<string>;
}

const App: React.FC<AppProps> = (props) => {
    const { fileContent, cssContent, availableCodeThemes, getCodeThemeUrl, getCodeThemeCss } = props;

    // Style states - these will now directly map to renderer options
    const [theme, setTheme] = useState('wechat'); // Default theme from refmd
    const [accentColor, setAccentColor] = useState('#0366d6');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [lineHeight, setLineHeight] = useState(1.75);
    const [textIndent, setTextIndent] = useState(false);
    const [textAlign, setTextAlign] = useState(false);
    const [macCodeBlocks, setMacCodeBlocks] = useState(false);
    const [codeTheme, setCodeTheme] = useState('github.css');
    const [convertLinks, setConvertLinks] = useState(false);
    const [codeThemeCssContent, setCodeThemeCssContent] = useState('');

    // Initialize renderer with default options
    const renderer = useMemo(() => {
        return new WechatRenderer({
            theme: themeMap[theme],
            fonts: '-apple-system, BlinkMacSystemFont, \'Helvetica Neue\', \'PingFang SC\', \'Microsoft YaHei\', \'Source Han Sans SC\', \'Noto Sans CJK SC\', \'WenQuanYi Micro Hei\', sans-serif',
            size: `${fontSize}px`,
            isUseIndent: textIndent,
            isUseJustify: textAlign,
            isMacCodeBlock: macCodeBlocks,
            citeStatus: convertLinks,
            primaryColor: accentColor, // Pass accent color as primaryColor to renderer
            codeBlockTheme: codeTheme, // Pass codeTheme name
        });
    }, []); // Only initialize once

    // Update renderer options when state changes
    useEffect(() => {
        renderer.setOptions({
            theme: themeMap[theme],
            fonts: '-apple-system, BlinkMacSystemFont, \'Helvetica Neue\', \'PingFang SC\', \'Microsoft YaHei\', \'Source Han Sans SC\', \'Noto Sans CJK SC\', \'WenQuanYi Micro Hei\', sans-serif',
            size: `${fontSize}px`,
            isUseIndent: textIndent,
            isUseJustify: textAlign,
            isMacCodeBlock: macCodeBlocks,
            citeStatus: convertLinks,
            primaryColor: accentColor,
            codeBlockTheme: codeTheme,
        });
        // Fetch code theme CSS content for copy logic
        getCodeThemeCss(codeTheme).then(setCodeThemeCssContent);
    }, [theme, fontSize, lineHeight, textIndent, textAlign, macCodeBlocks, convertLinks, accentColor, codeTheme, getCodeThemeCss]);

    const handleCopy = () => {
        if (!fileContent) {
            new Notice('No content to copy.');
            return;
        }
        // Use renderer's getHtmlForCopy method
        const finalHtmlForCopy = renderer.getHtmlForCopy(fileContent, cssContent + '\n' + codeThemeCssContent);
        navigator.clipboard.writeText(finalHtmlForCopy).then(() => {
            new Notice('Copied to clipboard successfully!');
        });
    };

    const handleUpload = () => {
        new Notice('Upload to Drafts: Not yet implemented.');
    };

    // Render HTML using the renderer
    const renderedHtml = renderer.render(fileContent || 'Loading...');

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <ShadowView 
                    html={renderedHtml}
                    css={cssContent} 
                    isDarkMode={isDarkMode} 
                    codeThemeUrl={getCodeThemeUrl(codeTheme)} // Still need this for live preview
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: '#f9f9f9' }}>
                <div className="mpeasy-toolbar" style={{ padding: '10px 15px', borderBottom: '1px solid #ddd', display: 'flex', gap: '10px' }}>
                    <button onClick={handleCopy}>Copy to WeChat</button>
                    <button onClick={handleUpload}>Upload to Drafts</button>
                </div>
                <StylePanel 
                    theme={theme}
                    onThemeChange={setTheme}
                    accentColor={accentColor}
                    onAccentColorChange={setAccentColor}
                    isDarkMode={isDarkMode} 
                    onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    lineHeight={lineHeight}
                    onLineHeightChange={setLineHeight}
                    textIndent={textIndent}
                    onTextIndentChange={setTextIndent}
                    textAlign={textAlign}
                    onTextAlignChange={setTextAlign}
                    macCodeBlocks={macCodeBlocks}
                    onMacCodeBlocksChange={setMacCodeBlocks}
                    availableCodeThemes={availableCodeThemes}
                    codeTheme={codeTheme}
                    onCodeThemeChange={setCodeTheme}
                    convertLinks={convertLinks}
                    onConvertLinksChange={setConvertLinks}
                />
            </div>
        </div>
    );
};

export default App;
