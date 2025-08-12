import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView } from 'obsidian';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer, parseFrontMatterAndContent } from '../core/renderer';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../core/wechatApi';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { processClipboardContent, preprocessMarkdown } from '../utils';
import CssEditor from './CssEditor'; // Import the new component

interface MPEasyViewProps {
    file: TFile;
    app: App;
    plugin: MPEasyPlugin;
    customCss: string;
    mermaidPath: string;
    mathjaxPath: string;
}

const MPEasyViewComponent = ({ file, app, plugin, customCss, mermaidPath, mathjaxPath }: MPEasyViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [rendererApi, setRendererApi] = useState<RendererAPI | null>(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [liveCss, setLiveCss] = useState(''); // State for the live CSS editor
    const [obsidianTheme, setObsidianTheme] = useState<'light' | 'dark'>('light');
    const scrollListenersRef = useRef<{ cleanUp: () => void } | null>(null); // Ref to hold cleanup function for scroll listeners

    const [opts, setOpts] = useState<Partial<IOpts>>({
        layoutThemeName: plugin.settings.layoutThemeName,
        fontSize: plugin.settings.fontSize,
        isUseIndent: plugin.settings.isUseIndent,
        primaryColor: plugin.settings.primaryColor,
        legend: plugin.settings.legend,
        isMacCodeBlock: plugin.settings.isMacCodeBlock,
        isCiteStatus: plugin.settings.isCiteStatus,
        isCountStatus: plugin.settings.isCountStatus,
        codeThemeName: plugin.settings.codeThemeName,
        customStyleName: plugin.settings.customStyleName,
    });

    // Effect to synchronize opts state with plugin.settings when plugin.settings change externally
    useEffect(() => {
        setOpts(prevOpts => ({
            ...prevOpts,
            layoutThemeName: plugin.settings.layoutThemeName,
            codeThemeName: plugin.settings.codeThemeName,
            customStyleName: plugin.settings.customStyleName,
            fontSize: plugin.settings.fontSize,
            primaryColor: plugin.settings.primaryColor,
            isUseIndent: plugin.settings.isUseIndent,
            legend: plugin.settings.legend,
            isMacCodeBlock: plugin.settings.isMacCodeBlock,
            isCiteStatus: plugin.settings.isCiteStatus,
            isCountStatus: plugin.settings.isCountStatus,
        }));
    }, [
        plugin.settings.layoutThemeName,
        plugin.settings.codeThemeName,
        plugin.settings.customStyleName,
        plugin.settings.fontSize,
        plugin.settings.primaryColor,
        plugin.settings.isUseIndent,
        plugin.settings.legend,
        plugin.settings.isMacCodeBlock,
        plugin.settings.isCiteStatus,
        plugin.settings.isCountStatus,
    ]);

    useEffect(() => {
        const getTheme = () => document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        setObsidianTheme(getTheme());
        const observer = new MutationObserver(() => {
            setObsidianTheme(getTheme());
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Effect to read file content with debouncing
    useEffect(() => {
        if (file) {
            app.vault.read(file).then(content => {
                setMarkdownContent(content);
            });
        }
    }, [file, app.vault]);

    // Effect to initialize renderer
    useEffect(() => {
        if (!iframeRef.current) return;

        const initialOpts: Partial<IOpts> = {
            ...opts,
            // The theme object is no longer needed here, it will be loaded as CSS
            layoutThemeName: plugin.settings.layoutThemeName,
            codeThemeName: plugin.settings.codeThemeName,
            customCSS: customCss,
            mermaidPath,
            mathjaxPath,
            obsidianTheme: obsidianTheme,
        };

        const api = initRenderer(initialOpts as IOpts);
        setRendererApi(api);

    }, [plugin.settings.layoutThemeName, plugin.settings.codeThemeName, customCss, mermaidPath, mathjaxPath, obsidianTheme]);

    // Effect to update renderer options when opts state changes
    useEffect(() => {
        if (rendererApi) {
            rendererApi.setOptions({ ...opts, obsidianTheme: obsidianTheme });
        }
    }, [opts, rendererApi, obsidianTheme]);

    const handleRefresh = () => {
        if (file) {
            app.vault.read(file).then(content => {
                setMarkdownContent(content);
                new Notice('内容已刷新！');
            });
        }
    };

    const handleCopy = async () => {
        if (!rendererApi || !iframeRef.current) {
            new Notice('渲染器尚未准备好。');
            return;
        }
        const preprocessedMarkdown = preprocessMarkdown(markdownContent);
        const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
        const htmlWithProcessedImages = await processLocalImages(parsedHtml, plugin, false);

        const hljsThemeCss = cssCache.current.get(opts.codeThemeName || 'default');
        const layoutThemeCss = cssCache.current.get(opts.layoutThemeName || 'default');

        if (!hljsThemeCss || !layoutThemeCss) {
            new Notice('请先等待主题和代码块样式加载完成。');
            return;
        }

        const customStyleCss = cssCache.current.get(opts.customStyleName || 'none');
        const allCss = `${layoutThemeCss}\n${hljsThemeCss}\n${customStyleCss || ''}\n${customCss}\n${liveCss}`;

        // Process clipboard content, which now includes CSS inlining
        const finalHtmlForClipboard = processClipboardContent(
            htmlWithProcessedImages,
            opts.primaryColor || '#000000',
            allCss
        );

        const blob = new Blob([finalHtmlForClipboard], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });

        navigator.clipboard.write([clipboardItem]).then(() => {
            new Notice('已成功复制到剪贴板！');
        }, (err) => {
            new Notice('复制失败: ' + err);
        });
    };

    const handleUpload = () => {
        // Parse front matter to get title and coverUrl
        const { yamlData } = parseFrontMatterAndContent(markdownContent);
        const title = (yamlData.title as string) || file.basename; // Use file basename as fallback title
        let coverUrl = (yamlData.cover as string) || ''; // Use empty string as fallback coverUrl

        // If coverUrl is still empty, try to find the first image in the markdown content
        if (!coverUrl) {
            const firstImageMatch = markdownContent.match(/!\[.*?\]\((.*?)\)/);
            if (firstImageMatch && firstImageMatch[1]) {
                coverUrl = firstImageMatch[1];
            }
        }

        new UploadModal(app, async (data) => { // Changed signature to accept data object
            if (!rendererApi) return;

            new Notice('正在上传封面图...');
            let thumb_media_id = '';
            if (coverUrl) { // Use coverUrl from front matter
                try {
                    const imageRes = await app.requestUrl({ url: coverUrl, method: 'GET', throw: false });
                    if (imageRes.status !== 200) throw new Error('封面图下载失败');
                    const imageBlob = new Blob([imageRes.arrayBuffer], { type: imageRes.headers['content-type'] });

                    const uploadRes = await wxUploadImage(plugin.settings, imageBlob, 'cover.jpg');
                    if (!uploadRes.media_id) throw new Error(`封面图上传失败: ${uploadRes.errmsg}`);
                    thumb_media_id = uploadRes.media_id;
                    new Notice('封面图上传成功!');
                } catch (e) {
                    new Notice(`封面图处理失败: ${e.message}`);
                    return;
                }
            }

            new Notice('正在上传草稿...');
            const preprocessedMarkdown = preprocessMarkdown(markdownContent);
            const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
            const finalHtml = await processLocalImages(parsedHtml, plugin, false);

            try {
                const result = await wxAddDraft(plugin.settings, {
                    title,
                    content: finalHtml,
                    thumb_media_id,
                });
                if (result.media_id) {
                    new Notice('草稿上传成功！');
                } else {
                    new Notice(`上传失败: ${result.errmsg}`);
                }
            } catch (e) {
                new Notice(`上传时发生错误: ${e.message}`);
            }
        }).open();
    };

    const handleOptsChange = (newOpts: Partial<IOpts>) => {
        const updatedOpts = { ...opts, ...newOpts };
        setOpts(updatedOpts);
        Object.assign(plugin.settings, updatedOpts);
        plugin.saveSettings();
    };

    // Cache for CSS files
    const cssCache = useRef<Map<string, string>>(new Map());
    
    // Debounced rendering effect
    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                // 1. Parse markdown to HTML using the renderer
                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
                const previewHtml = await processLocalImages(parsedHtml, plugin, true);

                // 2. Get theme CSS for code blocks
                const codeThemeName = opts.codeThemeName || 'default';
                let hljsThemeCss = cssCache.current.get(codeThemeName);
                if (!hljsThemeCss) {
                    const hljsThemePath = `${plugin.manifest.dir}/assets/codestyle/${codeThemeName}.css`;
                    try {
                        hljsThemeCss = await app.vault.adapter.read(hljsThemePath);
                        cssCache.current.set(codeThemeName, hljsThemeCss);
                    } catch (e) {
                        console.error(`Could not load code theme: ${hljsThemePath}`, e);
                        hljsThemeCss = ''; // Fallback to empty
                    }
                }

                // 3. Get layout theme CSS
                const layoutThemeName = opts.layoutThemeName || 'default';
                let layoutThemeCss = cssCache.current.get(layoutThemeName);
                if (!layoutThemeCss) {
                    const layoutThemePath = `${plugin.manifest.dir}/assets/theme/${layoutThemeName}.css`;
                    try {
                        layoutThemeCss = await app.vault.adapter.read(layoutThemePath);
                        cssCache.current.set(layoutThemeName, layoutThemeCss);
                    } catch (e) {
                        console.error(`Could not load layout theme: ${layoutThemePath}, falling back to default.`, e);
                        // Fallback to default if custom theme fails
                        if (layoutThemeName !== 'default') {
                            const defaultThemePath = `${plugin.manifest.dir}/assets/theme/default.css`;
                            layoutThemeCss = await app.vault.adapter.read(defaultThemePath);
                            cssCache.current.set('default', layoutThemeCss);
                        }
                    }
                }

                // 4. Get custom style CSS
                const customStyleName = opts.customStyleName || 'none';
                let customStyleCss = cssCache.current.get(customStyleName);
                if (!customStyleCss && customStyleName !== 'none') {
                    const customStylePath = `${plugin.manifest.dir}/assets/style/${customStyleName}.css`;
                    try {
                        customStyleCss = await app.vault.adapter.read(customStylePath);
                        cssCache.current.set(customStyleName, customStyleCss);
                    } catch (e) {
                        console.error(`Could not load custom style: ${customStylePath}`, e);
                        customStyleCss = ''; // Fallback to empty
                    }
                }

                const iframe = iframeRef.current;
                if (!iframe) return;

                // 5. Construct the full HTML for the iframe
                const fullHtml = `
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>:root { --mpe-primary-color: ${opts.primaryColor || '#007bff'}; }</style>
                        <style id="mpe-layout-theme">${layoutThemeCss || ''}</style>
                        <style id="mpe-code-theme">${hljsThemeCss}</style>
                        <style id="mpe-custom-style">${customStyleCss || ''}</style>
                        <style id="mpe-custom-css">${customCss}</style>
                        <style id="mpe-live-css">${liveCss}</style> 
                    </head>
                    <body class="theme-${layoutThemeName}" style="font-size: ${opts.fontSize || '16px'};">
                        <section id="output">${previewHtml}</section>
                        <script src="${mermaidPath}"></script>
                        <script>
                            if (typeof mermaid !== 'undefined') {
                                mermaid.initialize({ startOnLoad: false, theme: 'default' });
                            }
                        </script>
                    </body>
                    </html>
                `;

                // 5. Use srcdoc to update iframe content
                iframe.srcdoc = fullHtml;
                
                console.log(`MPEasy: Render prepared in ${performance.now() - startTime}ms`);

                // 6. After the iframe has loaded, run scripts and set up scroll sync
                iframe.onload = () => {
                    // Run Mermaid
                    if (iframe.contentWindow && typeof iframe.contentWindow.mermaid !== 'undefined') {
                        iframe.contentWindow.mermaid.run({
                            nodes: iframe.contentDocument.querySelectorAll('.mermaid')
                        });
                    }

                    // Setup Scroll Sync
                    if (scrollListenersRef.current) {
                        scrollListenersRef.current.cleanUp();
                    }

                    const previewWindow = iframe.contentWindow;
                    const previewEl = iframe.contentDocument.documentElement;
                    const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
                    if (!markdownView || !previewWindow || !previewEl) return;

                    const editorEl = (markdownView.getMode() === 'preview')
                        ? markdownView.containerEl.querySelector('.markdown-preview-view')
                        : (markdownView.editor.cm as any).scrollDOM;

                    if (!editorEl) return;

                    let isSyncing = false;

                    const handleEditorScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight);
                            previewEl.scrollTop = percentage * (previewEl.scrollHeight - previewEl.clientHeight);
                            setTimeout(() => isSyncing = false, 50); // Reset flag after a short delay
                        });
                    };

                    const handlePreviewScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
                            editorEl.scrollTop = percentage * (editorEl.scrollHeight - editorEl.clientHeight);
                            setTimeout(() => isSyncing = false, 50); // Reset flag after a short delay
                        });
                    };

                    editorEl.addEventListener('scroll', handleEditorScroll);
                    previewWindow.addEventListener('scroll', handlePreviewScroll);
                    
                    scrollListenersRef.current = { 
                        cleanUp: () => {
                            editorEl.removeEventListener('scroll', handleEditorScroll);
                            previewWindow.removeEventListener('scroll', handlePreviewScroll);
                        }
                    };
                };

            } catch (error) {
                console.error('Error during rendering:', error);
                new Notice('渲染预览时发生错误，请检查开发者控制台。');
            }
        }, 250); // 250ms debounce

        return () => {
            clearTimeout(debounceTimeout);
            if (scrollListenersRef.current) {
                scrollListenersRef.current.cleanUp();
            }
        };

    }, [markdownContent, rendererApi, opts, plugin, customCss, liveCss, mermaidPath, app.workspace, obsidianTheme]); // Updated dependencies

    return (
        <div className="mpeasy-view-container">
            <Header onRefresh={handleRefresh} onCopy={handleCopy} onUpload={handleUpload} />
            <div className="mpeasy-main-content">
                <div className="mpeasy-preview-wrapper">
                    <iframe
                        ref={iframeRef}
                        className="mpeasy-preview-iframe"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
                <div className="mpeasy-right-panel">
                    <StylePanel opts={opts} onOptsChange={handleOptsChange} app={app} />
                    <CssEditor value={liveCss} onChange={setLiveCss} />
                </div>
            </div>
        </div>
    );
};

export default MPEasyViewComponent;