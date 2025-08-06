import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, requestUrl, TFile } from 'obsidian';
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
}

const MPEasyViewComponent = ({ file, app, plugin }: MPEasyViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [rendererApi, setRendererApi] = useState<RendererAPI | null>(null);
    const [markdownContent, setMarkdownContent] = useState('');

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

    useEffect(() => {
        if (file) {
            app.vault.read(file).then(setMarkdownContent);
        }
    }, [file, app.vault]);

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
                    const imageRes = await requestUrl({ url: coverUrl, method: 'GET', throw: false });
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
            const rawHtml = rendererApi.parse(body);
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
        rendererApi?.setOptions(updatedOpts);
        plugin.saveSettings();
    };

    useEffect(() => {
        if (!iframeRef.current) return;
        const iframeWindow = iframeRef.current.contentWindow;
        if (!iframeWindow) return;

        const api = initRenderer(opts as IOpts, iframeWindow);
        setRendererApi(api);

        const script = iframeWindow.document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
        script.async = true;
        iframeWindow.document.head.appendChild(script);

    }, []);

    useEffect(() => {
        if (!rendererApi || !iframeRef.current || !markdownContent) return;

        const renderPreview = async () => {
            const parsedHtml = rendererApi.parse(markdownContent);
            const finalHtml = await processLocalImages(parsedHtml, plugin);

            try {
                const hljsThemeUrl = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${opts.codeBlockTheme}`;
                const hljsThemeCss = await requestUrl({ url: hljsThemeUrl });

                if (iframeRef.current) {
                    const doc = iframeRef.current.contentDocument;
                    if (doc) {
                        doc.open();
                        doc.write(`<html><head><style>${hljsThemeCss.text}</style></head><body><section id="output">${finalHtml}</section></body></html>`);
                        doc.close();
                    }
                }
            } catch (error) {
                console.error('Error loading highlight.js theme:', error);
                new Notice('加载代码块主题失败，请检查网络连接。');
                // Fallback rendering without the theme
                if (iframeRef.current) {
                    const doc = iframeRef.current.contentDocument;
                    if (doc) {
                        doc.open();
                        doc.write(`<html><head></head><body><section id="output">${finalHtml}</section></body></html>`);
                        doc.close();
                    }
                }
            }
        };

        renderPreview();

    }, [markdownContent, rendererApi, opts, plugin]);

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
