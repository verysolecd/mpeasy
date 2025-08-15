import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView, normalizePath, requestUrl } from 'obsidian';
import juice from 'juice';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer, parseFrontMatterAndContent } from '../core/renderer';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../sets/weixin-api';
import { processLocalImages } from '../core/htmlPostProcessor';
import type MPEasyPlugin from '../../main';
import { preprocessMarkdown, resolveCssVariables } from '../utils';
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

    const cssCache = useRef<Map<string, string>>(new Map());
    const cssLoadingCache = useRef<Map<string, Promise<string>>>(new Map());
    const renderCache = useRef({
        markdown: '',
        parsedHtml: '',
        previewHtml: '',
    });

    useEffect(() => {
        // Invalidate cache if the markdown content changes
        if (markdownContent !== renderCache.current.markdown) {
            renderCache.current = { 
                markdown: markdownContent,
                parsedHtml: '',
                previewHtml: ''
            };
        }
    }, [markdownContent]);

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

    const getStyledHtml = (forUpload: boolean): Promise<string | null> => {
        return new Promise(async (resolve) => {
            if (!rendererApi) {
                new Notice('渲染器尚未准备好。');
                return resolve(null);
            }

            let parsedHtml = renderCache.current.parsedHtml;
            if (!parsedHtml || markdownContent !== renderCache.current.markdown) {
                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                parsedHtml = await rendererApi.parse(preprocessedMarkdown);
                renderCache.current.parsedHtml = parsedHtml;
                renderCache.current.markdown = markdownContent;
            }

            const htmlWithImages = await processLocalImages(parsedHtml, plugin, !forUpload);

            const [hljsThemeCss, layoutThemeCss, customStyleCss] = await Promise.all([
                getCachedCss(opts.codeThemeName || 'default', 'codestyle'),
                getCachedCss(opts.layoutThemeName || 'default', 'theme'),
                getCachedCss(opts.customStyleName || 'none', 'style')
            ]);

            const allCss = resolveCssVariables(`${layoutThemeCss}\n${hljsThemeCss}\n${customStyleCss}\n${customCss}\n${liveCss}`, opts);

            const sandbox = document.createElement('iframe');
            sandbox.style.position = 'absolute';
            sandbox.style.width = '800px';
            sandbox.style.height = '1px';
            sandbox.style.top = '-1000px';
            sandbox.style.left = '-1000px';
            document.body.appendChild(sandbox);

            const fullHtml = `
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>${allCss}</style>
                </head>
                <body class="theme-${opts.layoutThemeName}" style="font-size: ${opts.fontSize || '16px'};">
                    <section id="output">${htmlWithImages}</section>
                    <script src="${mermaidPath}"></script>
                    <script src="${mathjaxPath}"></script>
                    <script>
                        document.addEventListener('DOMContentLoaded', () => {
                            const renderingPromises = [];
                            if (typeof mermaid !== 'undefined') {
                                mermaid.initialize({ startOnLoad: false, theme: 'default' });
                                const promise = mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
                                renderingPromises.push(promise);
                            }
                            if (typeof MathJax !== 'undefined') {
                                try {
                                    if (MathJax.typesetPromise) {
                                        const promise = MathJax.typesetPromise(document.querySelectorAll('#output'));
                                        renderingPromises.push(promise);
                                    } else if (MathJax.Hub) {
                                        const promise = new Promise((resolve) => {
                                            MathJax.Hub.Queue(['Typeset', MathJax.Hub, document.getElementById('output')]);
                                            MathJax.Hub.Queue(resolve);
                                        });
                                        renderingPromises.push(promise);
                                    } else {
                                        renderingPromises.push(Promise.resolve());
                                    }
                                } catch (e) {
                                    console.warn('MathJax rendering failed:', e);
                                    renderingPromises.push(Promise.resolve());
                                }
                            }
                            Promise.all(renderingPromises).then(() => {
                                window.parent.postMessage('mpeasy-render-complete', '*');
                            }).catch((error) => {
                                console.warn('Rendering promises failed:', error);
                                window.parent.postMessage('mpeasy-render-complete', '*');
                            });
                        });
                    </script>
                </body>
                </html>
            `;

            const messageListener = (event: MessageEvent) => {
                if (event.data === 'mpeasy-render-complete') {
                    if (!sandbox.contentDocument || !sandbox.contentDocument.body) {
                        document.body.removeChild(sandbox);
                        window.removeEventListener('message', messageListener);
                        return resolve(null);
                    }

                    const juicedHtml = juice(sandbox.contentDocument.documentElement.outerHTML, {
                        inlinePseudoElements: true,
                        preserveImportant: true,
                    });

                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = juicedHtml;
                    const outputSection = tempDiv.querySelector('#output');
                    let finalHtml = outputSection ? outputSection.innerHTML : '';

                    const finalDiv = document.createElement('div');
                    finalDiv.innerHTML = finalHtml;
                    const images = finalDiv.getElementsByTagName('img');
                    Array.from(images).forEach((image) => {
                        const width = image.getAttribute('width');
                        if (width) image.style.width = width;
                        image.removeAttribute('width');
                        image.removeAttribute('height');
                    });

                    document.body.removeChild(sandbox);
                    window.removeEventListener('message', messageListener);
                    resolve(finalDiv.innerHTML);
                }
            };

            window.addEventListener('message', messageListener);

            sandbox.srcdoc = fullHtml;
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
        const { yamlData } = parseFrontMatterAndContent(markdownContent);
        console.log('MPEasy: 解析到的 Frontmatter:', yamlData);
        const title = (yamlData.title as string) || file.basename;
        const bannerField = (yamlData.banner as string) || '';
        let coverUrl = '';

        if (bannerField) {
            const markdownMatch = bannerField.match(/!\[.*?\]\((.*?)\)/);
            if (markdownMatch) {
                coverUrl = markdownMatch[1];
            } else {
                coverUrl = bannerField;
            }
        } else {
            coverUrl = plugin.settings.defaultBanner;
        }
        console.log(`MPEasy: 文章标题: ${title}`);
        console.log(`MPEasy: 封面图 URL: ${coverUrl}`);

        new UploadModal(app, async () => {
            console.log('MPEasy: 上传确认框已确认');
            new Notice('正在处理内容和上传图片...');
            
            try {
                // 1. 处理HTML内容
                const finalHtml = await getStyledHtml(true);
                if (finalHtml === null) {
                    new Notice('内容处理失败，请重试。');
                    console.error('MPEasy: getStyledHtml 返回 null');
                    return;
                }
                console.log('MPEasy: HTML 内容处理完成');

                // 2. 准备所有图片上传任务
                const uploadTasks: Array<{blob: Blob, filename: string, type?: string, isCover?: boolean}> = [];
                
                // 添加封面图到上传任务（如果有）
                if (coverUrl) {
                    let coverBlob: Blob;
                    if (coverUrl.startsWith('http')) {
                        console.log(`MPEasy: 从 URL 下载封面图: ${coverUrl}`);
                        const imageRes = await requestUrl({ url: coverUrl, method: 'GET', throw: false });
                        if (imageRes.status !== 200) throw new Error('封面图下载失败');
                        coverBlob = new Blob([imageRes.arrayBuffer], { type: imageRes.headers['content-type'] });
                    } else {
                        const imagePath = normalizePath(coverUrl);
                        console.log(`MPEasy: 从本地路径读取封面图: ${imagePath}`);
                        const imageBuffer = await app.vault.adapter.readBinary(imagePath);
                        coverBlob = new Blob([imageBuffer]);
                    }
                    uploadTasks.push({blob: coverBlob, filename: 'cover.jpg', type: 'image', isCover: true});
                }

                // 3. 并行上传所有图片
                new Notice(`正在上传 ${uploadTasks.length} 张图片...`);
                console.log(`MPEasy: 开始并行上传 ${uploadTasks.length} 张图片`);

                const uploadPromises = uploadTasks.map(async (task, index) => {
                    try {
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
                        
                        console.log(`MPEasy: 图片 ${index + 1} 上传成功, media_id: ${uploadRes.media_id}`);
                        
                        return {
                            media_id: uploadRes.media_id,
                            isCover: task.isCover || false
                        };
                    } catch (error) {
                        console.error(`MPEasy: 图片 ${index + 1} 上传失败:`, error);
                        throw error;
                    }
                });

                const uploadResults = await Promise.all(uploadPromises);
                
                // 4. 获取封面图的media_id
                const coverResult = uploadResults.find(r => r.isCover);
                const thumb_media_id = coverResult ? coverResult.media_id : '';

                new Notice('正在上传草稿...');
                console.log('MPEasy: 开始上传草稿');
                
                // 5. 上传草稿
                const result = await wxAddDraft(requestUrl, plugin, {
                    title,
                    content: finalHtml,
                    thumb_media_id,
                    need_open_comment: 1,
                    only_fans_can_comment: 0,
                });
                
                console.log('MPEasy: 草稿上传结果:', result);
                if (result.media_id) {
                    new Notice('草稿上传成功！');
                    console.log(`MPEasy: 草稿上传成功, media_id: ${result.media_id}`);
                } else {
                    new Notice(`上传失败: ${result.errmsg}`);
                    console.error(`MPEasy: 草稿上传失败: ${result.errmsg}`);
                }
                
            } catch (e) {
                new Notice(`上传时发生错误: ${e.message}`);
                console.error('MPEasy: 上传过程中发生错误:', e);
            }
        }).open();
    };

    const getCachedCss = async (themeName: string, type: 'theme' | 'codestyle' | 'style'): Promise<string> => {
        if (themeName === 'none') return '';
        
        const cacheKey = `${type}-${themeName}`;
        
        // 如果已在内存缓存中，直接返回
        if (cssCache.current.has(cacheKey)) {
            return cssCache.current.get(cacheKey)!;
        }
        
        // 如果正在加载中，返回同一个Promise避免重复加载
        if (cssLoadingCache.current.has(cacheKey)) {
            return cssLoadingCache.current.get(cacheKey)!;
        }
        
        // 创建新的加载Promise
        const loadPromise = loadCssContent(themeName, type, cacheKey);
        cssLoadingCache.current.set(cacheKey, loadPromise);
        
        return loadPromise;
    };

    const loadCssContent = async (themeName: string, type: string, cacheKey: string): Promise<string> => {
        try {
            let filePath = '';
            switch (type) {
                case 'theme':
                    filePath = `${plugin.manifest.dir}/assets/theme/${themeName}.css`;
                    break;
                case 'codestyle':
                    filePath = `${plugin.manifest.dir}/assets/codestyle/${themeName}.css`;
                    break;
                case 'style':
                    filePath = `${plugin.manifest.dir}/assets/style/${themeName}.css`;
                    break;
            }
            
            const content = await app.vault.adapter.read(filePath);
            cssCache.current.set(cacheKey, content);
            return content;
        } catch (e) {
            console.error(`加载CSS失败: ${themeName}`, e);
            if (type === 'theme' && themeName !== 'default') {
                // 主题加载失败时回退到默认主题
                return loadCssContent('default', type, cacheKey);
            }
            return '';
        }
    };

    const handleOptsChange = (newOpts: Partial<IOpts>) => {
        const updatedOpts = { ...opts, ...newOpts };
        setOpts(updatedOpts);
        Object.assign(plugin.settings, updatedOpts);
        plugin.saveSettings();
        
        // 清除相关缓存以强制更新
        if (newOpts.codeThemeName || newOpts.layoutThemeName || newOpts.customStyleName) {
            const keysToClear = [];
            if (newOpts.codeThemeName) keysToClear.push(`codestyle-${newOpts.codeThemeName}`);
            if (newOpts.layoutThemeName) keysToClear.push(`theme-${newOpts.layoutThemeName}`);
            if (newOpts.customStyleName) keysToClear.push(`style-${newOpts.customStyleName}`);
            
            keysToClear.forEach(key => {
                cssCache.current.delete(key);
                cssLoadingCache.current.delete(key);
            });
        }
    };

    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                let parsedHtml = renderCache.current.parsedHtml;
                if (!parsedHtml) {
                    const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                    parsedHtml = await rendererApi.parse(preprocessedMarkdown);
                    renderCache.current.parsedHtml = parsedHtml;
                }

                let previewHtml = renderCache.current.previewHtml;
                if (!previewHtml) {
                    previewHtml = await processLocalImages(parsedHtml, plugin, true);
                    renderCache.current.previewHtml = previewHtml;
                }
                
                // 并行加载所有CSS文件
                const [hljsThemeCss, layoutThemeCss, customStyleCss] = await Promise.all([
                    getCachedCss(opts.codeThemeName || 'default', 'codestyle'),
                    getCachedCss(opts.layoutThemeName || 'default', 'theme'),
                    getCachedCss(opts.customStyleName || 'none', 'style')
                ]);

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
        }, 150); // 减少防抖时间

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