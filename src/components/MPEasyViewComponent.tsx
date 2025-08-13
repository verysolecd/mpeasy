import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView } from 'obsidian';
import juice from 'juice';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer, parseFrontMatterAndContent } from '../core/renderer';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../core/wechatApi';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { preprocessMarkdown } from '../utils';
import CssEditor from './CssEditor';

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
    const [liveCss, setLiveCss] = useState('');
    const [obsidianTheme, setObsidianTheme] = useState<'light' | 'dark'>('light');
    const scrollListenersRef = useRef<{ cleanUp: () => void } | null>(null);

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

    useEffect(() => {
        if (file) {
            app.vault.read(file).then(content => {
                setMarkdownContent(content);
            });
        }
    }, [file, app.vault]);

    useEffect(() => {
        if (!iframeRef.current) return;
        const initialOpts: Partial<IOpts> = {
            ...opts,
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

    const getStyledHtml = async (): Promise<string | null> => {
        if (!rendererApi) {
            new Notice('渲染器尚未准备好。');
            return null;
        }

        // 1. Get the basic rendered HTML
        const preprocessedMarkdown = preprocessMarkdown(markdownContent);
        const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
        const htmlWithProcessedImages = await processLocalImages(parsedHtml, plugin, false);

        // 2. Get all necessary CSS from the cache
        const hljsThemeCss = cssCache.current.get(opts.codeThemeName || 'default');
        const layoutThemeCss = cssCache.current.get(opts.layoutThemeName || 'default');
        if (!hljsThemeCss || !layoutThemeCss) {
            new Notice('主题样式尚未加载完成，请稍候。');
            return null;
        }
        const customStyleCss = cssCache.current.get(opts.customStyleName || 'none');

        // 3. Construct the full HTML document string, just like for the preview iframe
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
            <body class="theme-${opts.layoutThemeName}" style="font-size: ${opts.fontSize || '16px'};">
                <section id="output">${htmlWithProcessedImages}</section>
            </body>
            </html>
        `;

        // 4. Use juice to inline all styles from the <style> tags
        const juicedHtml = juice(fullHtml, {
            inlinePseudoElements: true,
            preserveImportant: true,
        });

        // 5. Parse the inlined HTML and extract the styled content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = juicedHtml;
        const outputSection = tempDiv.querySelector('#output');
        if (!outputSection) {
            new Notice('无法找到渲染内容进行复制。');
            return null;
        }

        // 6. Perform final post-processing for WeChat compatibility
        // This is a simplified version of the old processClipboardContent
        const finalDiv = document.createElement('div');
        finalDiv.innerHTML = outputSection.innerHTML;

        // Fix image styles
        const images = finalDiv.getElementsByTagName('img');
        Array.from(images).forEach((image) => {
            const width = image.getAttribute('width')!;
            const height = image.getAttribute('height')!;
            if (width) image.style.width = width;
            if (height) image.style.height = height;
            image.removeAttribute('width');
            image.removeAttribute('height');
        });

        return finalDiv.innerHTML;
    };

    const handleCopy = async () => {
        const finalHtml = await getStyledHtml();
        if (finalHtml === null) return;

        const blob = new Blob([finalHtml], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });

        navigator.clipboard.write([clipboardItem]).then(() => {
            new Notice('已成功复制到剪贴板！');
        }, (err) => {
            new Notice('复制失败: ' + err);
        });
    };

    const handleUpload = async () => {
        const { yamlData } = parseFrontMatterAndContent(markdownContent);
        const title = (yamlData.title as string) || file.basename;
        let coverUrl = (yamlData.cover as string) || '';

        if (!coverUrl) {
            const firstImageMatch = markdownContent.match(/!\[.*?\]\((.*?)\)/);
            if (firstImageMatch && firstImageMatch[1]) {
                coverUrl = firstImageMatch[1];
            }
        }

        new UploadModal(app, async () => {
            new Notice('正在处理内容...');
            const finalHtml = await getStyledHtml();
            if (finalHtml === null) {
                new Notice('内容处理失败，请重试。');
                return;
            }

            let thumb_media_id = '';
            if (coverUrl) {
                new Notice('正在上传封面图...');
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

    const cssCache = useRef<Map<string, string>>(new Map());
    
    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
                const previewHtml = await processLocalImages(parsedHtml, plugin, true);

                const codeThemeName = opts.codeThemeName || 'default';
                let hljsThemeCss = cssCache.current.get(codeThemeName);
                if (!hljsThemeCss) {
                    const hljsThemePath = `${plugin.manifest.dir}/assets/codestyle/${codeThemeName}.css`;
                    try {
                        hljsThemeCss = await app.vault.adapter.read(hljsThemePath);
                        cssCache.current.set(codeThemeName, hljsThemeCss);
                    } catch (e) {
                        console.error(`Could not load code theme: ${hljsThemePath}`, e);
                        hljsThemeCss = '';
                    }
                }

                const layoutThemeName = opts.layoutThemeName || 'default';
                let layoutThemeCss = cssCache.current.get(layoutThemeName);
                if (!layoutThemeCss) {
                    const layoutThemePath = `${plugin.manifest.dir}/assets/theme/${layoutThemeName}.css`;
                    try {
                        layoutThemeCss = await app.vault.adapter.read(layoutThemePath);
                        cssCache.current.set(layoutThemeName, layoutThemeCss);
                    } catch (e) {
                        console.error(`Could not load layout theme: ${layoutThemePath}, falling back to default.`, e);
                        if (layoutThemeName !== 'default') {
                            const defaultThemePath = `${plugin.manifest.dir}/assets/theme/default.css`;
                            layoutThemeCss = await app.vault.adapter.read(defaultThemePath);
                            cssCache.current.set('default', layoutThemeCss);
                        }
                    }
                }

                const customStyleName = opts.customStyleName || 'none';
                let customStyleCss = cssCache.current.get(customStyleName);
                if (!customStyleCss && customStyleName !== 'none') {
                    const customStylePath = `${plugin.manifest.dir}/assets/style/${customStyleName}.css`;
                    try {
                        customStyleCss = await app.vault.adapter.read(customStylePath);
                        cssCache.current.set(customStyleName, customStyleCss);
                    } catch (e) {
                        console.error(`Could not load custom style: ${customStylePath}`, e);
                        customStyleCss = '';
                    }
                }

                const iframe = iframeRef.current;
                if (!iframe) return;

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

                iframe.srcdoc = fullHtml;
                
                console.log(`MPEasy: Render prepared in ${performance.now() - startTime}ms`);

                iframe.onload = () => {
                    if (iframe.contentWindow && typeof iframe.contentWindow.mermaid !== 'undefined') {
                        iframe.contentWindow.mermaid.run({
                            nodes: iframe.contentDocument.querySelectorAll('.mermaid')
                        });
                    }

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
                            setTimeout(() => isSyncing = false, 50);
                        });
                    };

                    const handlePreviewScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
                            editorEl.scrollTop = percentage * (editorEl.scrollHeight - editorEl.clientHeight);
                            setTimeout(() => isSyncing = false, 50);
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
        }, 250);

        return () => {
            clearTimeout(debounceTimeout);
            if (scrollListenersRef.current) {
                scrollListenersRef.current.cleanUp();
            }
        };

    }, [markdownContent, rendererApi, opts, plugin, customCss, liveCss, mermaidPath, app.workspace, obsidianTheme]);

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