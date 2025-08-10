import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView } from 'obsidian';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer } from '../core/renderer';
import type { RendererAPI, IOpts, Theme } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../core/wechatApi';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { processClipboardContent } from '../utils';
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
    });

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
        const iframeWindow = iframeRef.current.contentWindow;
        if (!iframeWindow) return;

        const defaultTheme: Theme = {
            name: 'default',
            base: {
                'font-family': 'sans-serif',
                'font-size': '16px',
                'line-height': '1.6',
            },
            inline: {
                codespan: {
                    'font-family': 'monospace',
                    'background-color': '#f5f5f5',
                    'padding': '2px 4px',
                    'border-radius': '3px',
                },
                link: {
                    'color': '#007bff',
                    'text-decoration': 'none',
                },
                strong: {
                    'font-weight': 'bold',
                }
            },
            block: {
                p: {
                    'margin-top': '0',
                    'margin-bottom': '1em',
                },
                h1: { 'font-size': '2em', 'margin-bottom': '0.5em', 'font-weight': 'bold' },
                h2: { 'font-size': '1.5em', 'margin-bottom': '0.5em', 'font-weight': 'bold' },
                h3: { 'font-size': '1.25em', 'margin-bottom': '0.5em', 'font-weight': 'bold' },
                blockquote: {
                    'margin': '1em 0',
                    'padding': '0 1em',
                    'color': '#6a737d',
                    'border-left': '0.25em solid #dfe2e5',
                },
                code_pre: {
                    'padding': '1em',
                    'overflow': 'auto',
                    'border-radius': '3px',
                }
            },
            styles: {} as any, // This will be populated by buildTheme
        };

        const initialOpts: Partial<IOpts> = {
            ...opts,
            theme: defaultTheme, // Pass the structured theme object
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
        const outputElement = iframeRef.current.contentDocument.getElementById('output');
        if (!outputElement) {
            new Notice('无法找到渲染内容。');
            return;
        }

        new Notice('正在处理图片，请稍候...');
        const processedHtml = await processLocalImages(outputElement.innerHTML, plugin);
        outputElement.innerHTML = processedHtml; // Update the element with new image URLs

        const hljsThemeCss = hljsCssCache.current.get(opts.codeThemeName);
        if (!hljsThemeCss) {
            new Notice('请先等待代码块加载完成。');
            return;
        }

        processClipboardContent(outputElement, opts.primaryColor || '#000000', hljsThemeCss);

        const blob = new Blob([outputElement.outerHTML], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });

        navigator.clipboard.write([clipboardItem]).then(() => {
            new Notice('已成功复制到剪贴板！');
        }, (err) => {
            new Notice('复制失败: ' + err);
        });
    };

    const handleUpload = () => {
        new UploadModal(app, async (title, coverUrl) => {
            if (!rendererApi) return;

            new Notice('正在上传封面图...');
            let thumb_media_id = '';
            if (coverUrl) {
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
            const { markdownContent: body } = rendererApi.parseFrontMatterAndContent(markdownContent);
            const rawHtml = await rendererApi.parse(body);
            const finalHtml = await processLocalImages(rawHtml, plugin);

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

    // Cache for highlight.js CSS
    const hljsCssCache = useRef<Map<string, string>>(new Map());
    
    // Debounced rendering effect
    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                // 1. Parse markdown to HTML using the renderer
                const parsedHtml = await rendererApi.parse(markdownContent);
                const processedHtml = await processLocalImages(parsedHtml, plugin);

                // 2. Get theme CSS for code blocks
                let hljsThemeCss = hljsCssCache.current.get(opts.codeThemeName);
                if (!hljsThemeCss) {
                    const hljsThemePath = `${plugin.manifest.dir}/assets/style/${opts.codeThemeName}.css`;
                    hljsThemeCss = await app.vault.adapter.read(hljsThemePath);
                    hljsCssCache.current.set(opts.codeThemeName, hljsThemeCss);
                }

                const iframe = iframeRef.current;
                if (!iframe) return;

                // 3. Construct the full HTML for the iframe
                const fullHtml = `
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>${hljsThemeCss}</style>
                        <style>${customCss}</style>
                        <style>${liveCss}</style> 
                    </head>
                    <body style="font-size: ${opts.fontSize || '16px'};">
                        <section id="output">${processedHtml}</section>
                        <script src="${mermaidPath}"></script>
                        <script>
                            if (typeof mermaid !== 'undefined') {
                                mermaid.initialize({ startOnLoad: false, theme: 'default' });
                            }
                        </script>
                    </body>
                    </html>
                `;

                // 4. Use srcdoc to update iframe content
                iframe.srcdoc = fullHtml;
                
                console.log(`MPEasy: Render prepared in ${performance.now() - startTime}ms`);

                // 5. After the iframe has loaded, run scripts and set up scroll sync
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

                    const editorEl = markdownView.containerEl.querySelector('.cm-scroller') as HTMLElement;
                    if (!editorEl) return;

                    let isSyncing = false;

                    const handleEditorScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight);
                            previewEl.scrollTop = percentage * (previewEl.scrollHeight - previewEl.clientHeight);
                            isSyncing = false;
                        });
                    };

                    const handlePreviewScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
                            editorEl.scrollTop = percentage * (editorEl.scrollHeight - editorEl.clientHeight);
                            isSyncing = false;
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