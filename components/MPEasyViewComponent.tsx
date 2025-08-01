import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, requestUrl } from 'obsidian';
import Header from './Header';
import StylePanel from './StylePanel';
import { initRenderer } from '../src/core/renderer';
import { themeMap } from '../src/core/theme';
import type { RendererAPI, IOpts } from '../types';
import { UploadModal } from './UploadModal';
import { wxAddDraft, wxUploadImage } from '../src/core/wechatApi';
import { processLocalImages } from '../src/core/htmlPostProcessor';
import type MPEasyPlugin from '../main';

interface MPEasyViewProps {
    markdownContent: string;
    app: App;
    plugin: MPEasyPlugin;
}

const MPEasyViewComponent = ({ markdownContent, app, plugin }: MPEasyViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [rendererApi, setRendererApi] = useState<RendererAPI | null>(null);
    const [opts, setOpts] = useState<IOpts>(() => ({
        theme: themeMap[plugin.settings.themeName as keyof typeof themeMap] || themeMap.default,
        size: plugin.settings.fontSize,
        isUseIndent: plugin.settings.isUseIndent,
        legend: 'alt',
        citeStatus: true,
        countStatus: true,
    }));

    const handleCopy = async () => {
        if (!rendererApi) {
            new Notice('渲染器尚未准备好。');
            return;
        }
        const { markdownContent: body } = rendererApi.parseFrontMatterAndContent(markdownContent);
        const rawHtml = rendererApi.parse(body);
        const finalHtml = await processLocalImages(rawHtml, plugin);
        navigator.clipboard.writeText(finalHtml).then(() => {
            new Notice('已成功复制到剪贴板！');
        });
    };

    const handleUpload = () => {
        new UploadModal(app, async (title, coverUrl) => {
            if (!rendererApi) return;

            new Notice('正在上传封面图...');
            let thumb_media_id = '';
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
        if (newOpts.theme) {
            updatedOpts.theme = themeMap[newOpts.theme as any as keyof typeof themeMap] || opts.theme;
            plugin.settings.themeName = updatedOpts.theme.name;
        }
        if (newOpts.isUseIndent !== undefined) {
            plugin.settings.isUseIndent = newOpts.isUseIndent;
        }
        if (newOpts.size) {
            plugin.settings.fontSize = newOpts.size;
        }
        setOpts(updatedOpts);
        rendererApi?.setOptions(updatedOpts);
        plugin.saveSettings();
    };

    useEffect(() => {
        if (!iframeRef.current) return;
        const iframeWindow = iframeRef.current.contentWindow;
        if (!iframeWindow) return;

        const finalOpts = {
            ...opts,
            fonts: `"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "\u5FAE软雅黑", Arial, sans-serif`,
        };

        const api = initRenderer(finalOpts, iframeWindow);
        setRendererApi(api);

        const script = iframeWindow.document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
        script.async = true;
        iframeWindow.document.head.appendChild(script);

    }, []);

    useEffect(() => {
        if (!rendererApi || !iframeRef.current) return;

        const parsedHtml = rendererApi.parse(markdownContent);
        const finalHtml = `<html><body>${parsedHtml}</body></html>`;
        iframeRef.current.srcdoc = finalHtml;

    }, [markdownContent, rendererApi, opts]);

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
