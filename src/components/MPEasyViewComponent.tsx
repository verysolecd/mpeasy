import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView, normalizePath, requestUrl } from 'obsidian';
import juice from 'juice';
import less from 'less';
import Header from './Header';
import StylePanel from './StylePanel';
import WeChatArticleSettings from './WeChatArticleSettings';
import { initRenderer, parseFrontMatterAndContent } from '../core/renderer';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../sets/weixin-api';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { preprocessMarkdown } from '../utils';

interface MPEasyViewProps {
    file: TFile;
    app: App;
    plugin: MPEasyPlugin;
    customCss: string;
    mermaidPath: string;
    mathjaxPath: string;
}

const MPEasyViewComponent = ({ file, app, plugin, mermaidPath, mathjaxPath }: MPEasyViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [rendererApi, setRendererApi] = useState<RendererAPI | null>(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [customCss, setCustomCss] = useState(plugin.settings.customCss);
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
        enableComments: plugin.settings.enableComments,
        onlyFansCanComment: plugin.settings.onlyFansCanComment,
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
            enableComments: plugin.settings.enableComments,
            onlyFansCanComment: plugin.settings.onlyFansCanComment,
            customCss: plugin.settings.customCss,
        }));
        setCustomCss(plugin.settings.customCss);
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
        plugin.settings.enableComments,
        plugin.settings.onlyFansCanComment,
        plugin.settings.customCss,
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
        const api = initRenderer(initialOpts as IOpts, () => iframeRef.current?.contentWindow || null);
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

    const getStyledHtml = async (forUpload: boolean): Promise<string | null> => {
        return new Promise(async (resolve) => {
            if (!rendererApi) {
                new Notice('渲染器尚未准备好。');
                return resolve(null);
            }

            const preprocessedMarkdown = preprocessMarkdown(markdownContent);
            const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
            console.log('MPEasy Rendered HTML (getStyledHtml):', parsedHtml);

            const htmlWithImages = await processLocalImages(parsedHtml, plugin, !forUpload);

            const themeLess = await app.vault.adapter.read(`${plugin.manifest.dir}/assets/less/theme.less`);
            const appLess = await app.vault.adapter.read(`${plugin.manifest.dir}/assets/less/app.less`);
            const allLess = themeLess + '\n' + appLess;

            const lessOptions = {
                modifyVars: {
                    '@primary-color': opts.primaryColor || '#007bff',
                    '@layout-theme-name': `'${opts.layoutThemeName || 'default'}'`,
                    '@code-theme-name': `'${opts.codeThemeName || 'default'}'`,
                }
            };

            const compiledCss = (await less.render(allLess, lessOptions)).css;

            const allCss = `${compiledCss}\n${customCss}`;

            const juicedHtml = juice.inlineContent(htmlWithImages, allCss, {
                inlinePseudoElements: true,
                preserveImportant: true,
            });

            resolve(juicedHtml);
        });
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
        const { yamlData, markdownContent: content } = parseFrontMatterAndContent(markdownContent);
        const title = (yamlData.title as string) || file.basename;
        
        let bannerField = (yamlData.banner as string) || '';
        
        if (!bannerField) {
            const bannerMatch = markdownContent.match(/^banner:\s*(!\[.*?\]\(.*?\)|!\[\[.*?\]\]|[^\n]+)/m);
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
        plugin.settings.customCss = customCss;
        plugin.saveSettings();
        new Notice('自定义CSS已保存!');
    };

    const handleOptsChange = (newOpts: Partial<IOpts>) => {
        const updatedOpts = { ...opts, ...newOpts };
        setOpts(updatedOpts);
        Object.assign(plugin.settings, updatedOpts);
        plugin.saveSettings();

        if (iframeRef.current && iframeRef.current.contentDocument) {
            const body = iframeRef.current.contentDocument.body;
            if (newOpts.layoutThemeName) {
                body.className = `theme-${newOpts.layoutThemeName}`;
            }
            if (newOpts.fontSize) {
                body.style.fontSize = newOpts.fontSize;
            }
        }
    };

    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                const parsedHtml = await rendererApi.parse(preprocessedMarkdown);
                console.log('MPEasy Rendered HTML:', parsedHtml);
                const previewHtml = await processLocalImages(parsedHtml, plugin, true);
                
                const themeLess = await app.vault.adapter.read(`${plugin.manifest.dir}/assets/less/theme.less`);
                const appLess = await app.vault.adapter.read(`${plugin.manifest.dir}/assets/less/app.less`);
                const allLess = themeLess + '\n' + appLess;

                const lessOptions = {
                    modifyVars: {
                        '@primary-color': opts.primaryColor || '#007bff'
                    }
                };
    
                const compiledCss = (await less.render(allLess, lessOptions)).css;

                const iframe = iframeRef.current;
                if (!iframe) return;

                const fullHtml = `
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>${compiledCss}\n${customCss}</style>
                    </head>
                    <body class="theme-${opts.layoutThemeName || 'default'}" style="font-size: ${opts.fontSize || '16px'};">
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
    }, [markdownContent, rendererApi, plugin, customCss, mermaidPath, app.workspace, obsidianTheme]);

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
                    <WeChatArticleSettings opts={opts} onOptsChange={handleOptsChange} />
                    <StylePanel
                        opts={opts}
                        onOptsChange={handleOptsChange}
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
