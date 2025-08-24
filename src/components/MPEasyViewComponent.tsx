import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView, normalizePath, requestUrl } from 'obsidian';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer, parseFrontMatterAndContent } from '../core/renderer';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../sets/weixin-api';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { preprocessMarkdown } from '../utils';
import { MPEasySettings } from '../sets/settings';

interface MPEasyViewProps {
    file: TFile;
    app: App;
    plugin: MPEasyPlugin;
    settings: MPEasySettings;
    onSettingsChange: (newSettings: Partial<MPEasySettings>) => void;
    customCss: string;
    mermaidPath: string;
    mathjaxPath: string;
}

const MPEasyViewComponent = ({ file, app, plugin, settings, onSettingsChange, mermaidPath, mathjaxPath }: MPEasyViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [rendererApi, setRendererApi] = useState<RendererAPI | null>(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [customCss, setCustomCss] = useState(settings.customCss);
    const [obsidianTheme, setObsidianTheme] = useState<'light' | 'dark'>('light');
    const scrollListenersRef = useRef<{ cleanUp: () => void } | null>(null);
    const [codeThemeCss, setCodeThemeCss] = useState('');

    useEffect(() => {
        if (settings.codeThemeName) {
            const codeThemeCssPath = normalizePath(`${plugin.manifest.dir}/assets/codestyle/${settings.codeThemeName}.css`);
            console.log('Loading code theme from:', codeThemeCssPath); // Log the path
            app.vault.adapter.read(codeThemeCssPath).then(css => {
                console.log('Code theme CSS loaded:', css.substring(0, 100)); // Log first 100 chars of CSS
                setCodeThemeCss(css);
            }).catch(err => {
                console.error(`Failed to load code theme CSS: ${codeThemeCssPath}`, err);
                new Notice(`加载代码主题样式失败: ${settings.codeThemeName}`);
            });
        }
    }, [settings.codeThemeName, app.vault.adapter, plugin.manifest.dir]);

    

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
            ...settings,
            layoutThemeName: plugin.settings.layoutThemeName,
            codeThemeName: plugin.settings.codeThemeName,
            customCSS: customCss,
            mermaidPath,
            mathjaxPath,
            obsidianTheme: obsidianTheme,
        };
        const api = initRenderer(initialOpts as IOpts, () => iframeRef.current?.contentWindow || null);
        setRendererApi(api);
    }, [plugin.settings.layoutThemeName, plugin.settings.codeThemeName, customCss, mermaidPath, mathjaxPath, obsidianTheme]);

    useEffect(() => {
        if (rendererApi) {
            rendererApi.setOptions({ ...settings, obsidianTheme: obsidianTheme });
            console.log('MPEasyViewComponent: settings.isUseIndent changed to', settings.isUseIndent);
        }
    }, [settings, rendererApi, obsidianTheme]);

    const handleRefresh = () => {
        if (file) {
            app.vault.read(file).then(content => {
                setMarkdownContent(content);
                new Notice('内容已刷新！');
            });
        }
    };

    const getStyledHtml = async (forUpload: boolean): Promise<string | null> => {
        if (!rendererApi) {
            new Notice('渲染器尚未准备好。');
            return null;
        }

        // Re-parse the markdown content with inline styles
        const preprocessedMarkdown = preprocessMarkdown(markdownContent);
        let finalHtml = await rendererApi.parse(preprocessedMarkdown, true, codeThemeCss);

        // Process local images for upload if necessary
        finalHtml = await processLocalImages(finalHtml, plugin, !forUpload);

        return finalHtml;
    };

    const handleCopy = async () => {
        new Notice('正在处理内容以便复制...');
        const finalHtml = await getStyledHtml(false);
        if (finalHtml === null) {
            new Notice('处理失败，请重试。');
            return;
        }
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        navigator.clipboard.write([clipboardItem]).then(() => {
            new Notice('已成功复制到剪贴板！');
        }, (err) => {
            new Notice('复制失败: ' + err);
        });
    };

    const handleUpload = async () => {
        console.log('MPEasy: 开始上传流程');
        const { yamlData } = parseFrontMatterAndContent(markdownContent);
        const title = (yamlData.title as string) || file.basename;
        
        let bannerField = (yamlData.banner as string) || '';
        
        if (!bannerField) {
            const bannerMatch = markdownContent.match(/^banner:\s*(!\[.*?\]\(.*\)|!\[\[.*?\]\]|[^\n]+)/m);
            if (bannerMatch) {
                bannerField = bannerMatch[1].trim();
            }
        }
        
        let coverUrl = '';

        if (bannerField) {
            let extractedUrl = '';
            
            const markdownMatch = bannerField.match(/!\s*?\[.*?\].*?\((.*?)\)/);
            if (markdownMatch) {
                extractedUrl = markdownMatch[1];
            } else if (bannerField.startsWith('![[') && bannerField.endsWith(']]')) {
                extractedUrl = bannerField.slice(3, -2);
            } else {
                extractedUrl = bannerField.trim();
            }

            if (!extractedUrl.startsWith('http') && !extractedUrl.startsWith('/')) {
                const currentDir = file.parent?.path || '';
                extractedUrl = normalizePath(currentDir + '/' + extractedUrl);
            }

            coverUrl = extractedUrl;
            
            if (!coverUrl.startsWith('http')) {
                try {
                    const exists = await app.vault.adapter.exists(coverUrl);
                    if (!exists) {
                        new Notice(`警告：指定的封面图不存在: ${coverUrl}`);
                    }
                } catch (e) {
                    console.warn(`MPEasy: 验证封面图文件时出错: ${e.message}`);
                }
            }
        } else {
            coverUrl = plugin.settings.defaultBanner;
        }

        new UploadModal(app, async () => {
            new Notice('正在处理内容和上传图片...');
            
            try {
                const finalHtml = await getStyledHtml(true);
                if (finalHtml === null) {
                    new Notice('内容处理失败，请重试。');
                    return;
                }

                const uploadTasks: Array<{blob: Blob, filename: string, type?: string, isCover?: boolean}> = [];
                
                if (coverUrl) {
                    let coverBlob: Blob;
                    if (coverUrl.startsWith('http')) {
                        const imageRes = await requestUrl({ url: coverUrl, method: 'GET', throw: false });
                        if (imageRes.status !== 200) throw new Error('封面图下载失败');
                        coverBlob = new Blob([imageRes.arrayBuffer], { type: imageRes.headers['content-type'] });
                    } else {
                        const imagePath = normalizePath(coverUrl);
                        const imageBuffer = await app.vault.adapter.readBinary(imagePath);
                        coverBlob = new Blob([imageBuffer]);
                    }
                    let actualFilename = 'cover.jpg';
                    if (coverUrl.startsWith('http')) {
                        const urlParts = coverUrl.split('/');
                        const filenameFromUrl = urlParts[urlParts.length - 1];
                        if (filenameFromUrl && filenameFromUrl.includes('.')) {
                            actualFilename = filenameFromUrl;
                        }
                    } else {
                        const pathParts = coverUrl.split('/');
                        const filenameFromPath = pathParts[pathParts.length - 1];
                        if (filenameFromPath && filenameFromPath.includes('.')) {
                            actualFilename = filenameFromPath;
                        }
                    }
                    uploadTasks.push({blob: coverBlob, filename: actualFilename, type: 'image', isCover: true});
                }

                new Notice(`正在上传 ${uploadTasks.length} 张图片...`);

                const uploadPromises = uploadTasks.map(async (task) => {
                    const uploadRes = await wxUploadImage(
                        requestUrl, 
                        plugin, 
                        task.blob, 
                        task.filename, 
                        task.type
                    );
                    
                    if (!uploadRes.media_id) {
                        throw new Error(`图片上传失败: ${uploadRes.errmsg || '未知错误'}`);
                    }
                    
                    return {
                        media_id: uploadRes.media_id,
                        isCover: task.isCover || false
                    };
                });

                const uploadResults = await Promise.all(uploadPromises);
                
                const coverResult = uploadResults.find(r => r.isCover);
                const thumb_media_id = coverResult ? coverResult.media_id : '';

                new Notice('正在上传草稿...');
                
                const author = yamlData.author as string || '';
                const digest = yamlData.digest as string || '';
                const content_source_url = yamlData.source as string || '';
                const result = await wxAddDraft(requestUrl, plugin, {
                    title,
                    author,
                    digest,
                    content_source_url,
                    content: finalHtml,
                    thumb_media_id,
                    need_open_comment: plugin.settings.enableComments ? 1 : 0,
                    only_fans_can_comment: plugin.settings.onlyFansCanComment ? 0 : 1,
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

    const handleSaveCustomCss = () => {
        onSettingsChange({ customCss: customCss });
        new Notice('自定义CSS已保存!');
    };

    

    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                const parsedHtml = await rendererApi.parse(preprocessedMarkdown, false, codeThemeCss);
                const previewHtml = await processLocalImages(parsedHtml, plugin, true);

                const iframe = iframeRef.current;
                if (!iframe) return;

                const fullHtml = `
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>${codeThemeCss}</style>                        
                        <style>${rendererApi.getStyles()}${customCss}</style>
                    </head>
                    <body>
                        <section id="output">${previewHtml}</section>
                        <script src="${mermaidPath}"></script>
                        <script src="${mathjaxPath}"></script>
                        <script>
                            document.addEventListener('DOMContentLoaded', () => {
                                const promises = [];
                                if (typeof mermaid !== 'undefined') {
                                    mermaid.initialize({ startOnLoad: false, theme: 'default' });
                                    promises.push(mermaid.run({ nodes: document.querySelectorAll('.mermaid') }));
                                }
                                if (typeof MathJax !== 'undefined' && MathJax.startup) {
                                    promises.push(MathJax.startup.promise.then(() => 
                                        MathJax.typesetPromise(document.querySelectorAll('#output'))
                                    ));
                                }
                                Promise.all(promises).catch(console.warn);
                            });
                        </script>
                    </body>
                    </html>
                `;

                iframe.srcdoc = fullHtml;
                console.log('MPEasy: fullHtml content:', fullHtml);
                console.log(`MPEasy: Render prepared in ${performance.now() - startTime}ms`);

                iframe.onload = () => {
                    if (scrollListenersRef.current) {
                        scrollListenersRef.current.cleanUp();
                    }

                    const previewWindow = iframe.contentWindow;
                    const previewEl = iframe.contentDocument?.documentElement;
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
                            const percentage = editorEl.scrollTop / Math.max(1, editorEl.scrollHeight - editorEl.clientHeight);
                            previewEl.scrollTop = percentage * Math.max(1, previewEl.scrollHeight - previewEl.clientHeight);
                            setTimeout(() => isSyncing = false, 50);
                        });
                    };

                    const handlePreviewScroll = () => {
                        if (isSyncing) return;
                        isSyncing = true;
                        requestAnimationFrame(() => {
                            const percentage = previewEl.scrollTop / Math.max(1, previewEl.scrollHeight - previewEl.clientHeight);
                            editorEl.scrollTop = percentage * Math.max(1, editorEl.scrollHeight - editorEl.clientHeight);
                            setTimeout(() => isSyncing = false, 50);
                        });
                    };

                    editorEl.addEventListener('scroll', handleEditorScroll, { passive: true });
                    previewWindow.addEventListener('scroll', handlePreviewScroll, { passive: true });

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
        }, 150); 

        return () => {
            clearTimeout(debounceTimeout);
            if (scrollListenersRef.current) {
                scrollListenersRef.current.cleanUp();
            }
        };
    }, [markdownContent, rendererApi, settings, plugin, customCss, mermaidPath, app.workspace, obsidianTheme, codeThemeCss]);

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
                    <StylePanel
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                        app={app}
                        customCss={customCss}
                        setCustomCss={setCustomCss}
                        onSaveCustomCss={handleSaveCustomCss}
                    />
                </div>
            </div>
        </div>
    );
};

export default MPEasyViewComponent;
