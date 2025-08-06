import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile } from 'obsidian';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer } from '../src/core/renderer';
import { themeMap } from '../src/core/theme';
import type { RendererAPI, IOpts } from '../src/types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../src/core/wechatApi';
import { processLocalImages } from '../src/core/htmlPostProcessor';
import type MPEasyPlugin from '../main';
import { processClipboardContent } from '../src/utils';

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

    // Initialize opts state without static props
    const [opts, setOpts] = useState<Partial<IOpts>>(() => ({
        theme: themeMap[plugin.settings.themeName as keyof typeof themeMap] || themeMap.default,
        size: plugin.settings.fontSize,
        isUseIndent: plugin.settings.isUseIndent,
        legend: plugin.settings.legend,
        citeStatus: plugin.settings.isCiteStatus,
        countStatus: plugin.settings.isCountStatus,
        isMacCodeBlock: plugin.settings.isMacCodeBlock,
        codeBlockTheme: plugin.settings.codeBlockTheme,
        primaryColor: plugin.settings.primaryColor,
        fonts: `"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "\u5FAE软雅黑", Arial, sans-serif`,
    }));

    // Effect to read file content
    useEffect(() => {
        if (file) {
            app.vault.read(file).then(setMarkdownContent);
        }
    }, [file, app.vault]);

    // Effect to initialize renderer (runs only once on mount)
    useEffect(() => {
        if (!iframeRef.current) return;
        const iframeWindow = iframeRef.current.contentWindow;
        if (!iframeWindow) return;

        // Pass all necessary options, including static props
        const initialOpts: IOpts = {
            ...opts as IOpts, // Cast to IOpts, assuming all required fields are present or optional
            customCSS,
            mermaidPath,
            mathjaxPath,
        };

        const api = initRenderer(initialOpts, iframeWindow);
        setRendererApi(api);

        // Cleanup function if needed (e.g., unmount renderer)
        // return () => { /* cleanup */ };
    }, []); // Empty dependency array ensures this runs only once

    // Effect to update renderer options when opts state changes
    useEffect(() => {
        if (rendererApi) {
            // Only update options that are part of the opts state
            const currentOpts: Partial<IOpts> = {
                theme: opts.theme,
                size: opts.size,
                isUseIndent: opts.isUseIndent,
                legend: opts.legend,
                citeStatus: opts.citeStatus,
                countStatus: opts.countStatus,
                isMacCodeBlock: opts.isMacCodeBlock,
                codeBlockTheme: opts.codeBlockTheme,
                primaryColor: opts.primaryColor,
                fonts: opts.fonts,
                // customCSS, mermaidPath, mathjaxPath are static for the renderer instance
            };
            rendererApi.setOptions(currentOpts);
        }
    }, [opts, rendererApi]); // Triggered when opts state or rendererApi changes

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

        processClipboardContent(outputElement, opts.primaryColor || '#000000');

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

        if (newOpts.theme && typeof newOpts.theme === 'string') {
            plugin.settings.themeName = newOpts.theme;
            updatedOpts.theme = themeMap[newOpts.theme as keyof typeof themeMap] || opts.theme;
        } else {
            Object.assign(plugin.settings, newOpts);
        }

        setOpts(updatedOpts);
        plugin.saveSettings();
    };

    // The renderPreview useEffect will now correctly depend on rendererApi and markdownContent
    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const renderPreview = async () => {
            const parsedHtml = await rendererApi.parse(markdownContent);
            const finalHtml = await processLocalImages(parsedHtml, plugin);

            try {
                const hljsThemePath = `${plugin.manifest.dir}/node_modules/highlight.js/styles/${opts.codeBlockTheme}`;
                const hljsThemeCss = await app.vault.adapter.read(hljsThemePath);

                const iframe = iframeRef.current;
                if (iframe) {
                    const doc = iframe.contentDocument;
                    if (doc) {
                        doc.open();
                        doc.write(`<html><head><style>${hljsThemeCss}</style></head><body><section id="output">${finalHtml}</section></body></html>`);
                        doc.close();
                    }
                }
            } catch (error) {
                console.error('Error during rendering:', error);
                new Notice('渲染预览时发生错误，请检查开发者控制台。');
            }
        };

        renderPreview();

    }, [markdownContent, rendererApi, opts.codeBlockTheme, plugin, app.vault.adapter]); // opts.codeBlockTheme is specific enough

    return (
        <div className="mpeasy-view-container">
            <Header onCopy={handleCopy} onUpload={handleUpload} />
            <div className="mpeasy-main-content">
                <div className="mpeasy-preview-wrapper">
                    <iframe
                        ref={iframeRef}
                        className="mpeasy-preview-iframe"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
                <StylePanel opts={opts} onOptsChange={handleOptsChange} />
            </div>
        </div>
    );
};

export default MPEasyViewComponent;