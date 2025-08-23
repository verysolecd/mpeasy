import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Notice, TFile, MarkdownView, normalizePath } from 'obsidian';
import type MPEasyPlugin from '../../main';
import { preprocessMarkdown } from '../utils';
import { MPEasySettings } from '../settings';

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
    const [markdownContent, setMarkdownContent] = useState('');
    const [customCss, setCustomCss] = useState(settings.customCss);
    const [obsidianTheme, setObsidianTheme] = useState<'light' | 'dark'>('light');
    const scrollListenersRef = useRef<{ cleanUp: () => void } | null>(null);
    const [codeThemeCss, setCodeThemeCss] = useState('');

    useEffect(() => {
        if (settings.codeThemeName) {
            const cssPath = normalizePath(`${plugin.manifest.dir}/assets/codestyle/${settings.codeThemeName}.css`);
            app.vault.adapter.read(cssPath).then(css => {
                setCodeThemeCss(css);
            }).catch(err => {
                console.error(`Failed to load code theme CSS: ${cssPath}`, err);
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
        if (!iframeRef.current || !markdownContent) return;

        const debounceTimeout = setTimeout(async () => {
            try {
                const startTime = performance.now();

                const preprocessedMarkdown = preprocessMarkdown(markdownContent);
                
                const iframe = iframeRef.current;
                if (!iframe) return;

                const previewContainer = document.createElement('div');

                await plugin.rendererService.renderForPreview(preprocessedMarkdown, previewContainer);
                
                const fullHtml = `
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>${codeThemeCss}</style>                        
                        <style>${customCss}</style>
                    </head>
                    <body>
                        <section id="output">${previewContainer.innerHTML}</section>
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
                            window.removeEventListener('scroll', handlePreviewScroll);
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
    }, [markdownContent, settings, plugin, customCss, mermaidPath, app.workspace, obsidianTheme, codeThemeCss]);

    return (
        <div className="mpeasy-view-container">
            <div className="mpeasy-main-content">
                <div className="mpeasy-preview-wrapper">
                    <iframe
                        ref={iframeRef}
                        className="mpeasy-preview-iframe"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
};

export default MPEasyViewComponent;
