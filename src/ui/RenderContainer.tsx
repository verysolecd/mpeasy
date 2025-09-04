import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MarkdownRenderer } from '../renderer/MarkdownRenderer';
import { RenderOptions } from '../types';
import { debounce } from '../utils/debounce';
import Preview from './Preview';
import StylePanel from './StylePanel';
import { App, MarkdownView } from 'obsidian';

interface RenderContainerProps {
    app: App;
}

const RenderContainer: React.FC<RenderContainerProps> = ({ app }) => {
    const [markdownContent, setMarkdownContent] = useState('');
    const [renderedHtml, setRenderedHtml] = useState('');
    const [renderOptions, setRenderOptions] = useState<RenderOptions>({
        theme: 'wechat',
        fontSize: 16,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;',
        lineHeight: 1.75,
        paragraphSpacing: 1.0,
    });

    const markdownRendererRef = useRef<MarkdownRenderer | null>(null);

    // Initialize MarkdownRenderer instance once
    useEffect(() => {
        if (!markdownRendererRef.current) {
            markdownRendererRef.current = new MarkdownRenderer();
        }
    }, []);

    // Update markdown content from active editor
    useEffect(() => {
        const updateMarkdownContent = () => {
            const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
            if (activeLeaf) {
                setMarkdownContent(activeLeaf.editor.getValue());
            } else {
                setMarkdownContent('');
            }
        };

        // Initial load
        updateMarkdownContent();

        // Listen for active leaf changes and editor changes
        const eventRef = app.workspace.on('active-leaf-change', updateMarkdownContent);
        const editorChangeRef = app.workspace.on('editor-change', updateMarkdownContent);

        return () => {
            app.workspace.off('active-leaf-change', eventRef);
            app.workspace.off('editor-change', editorChangeRef);
        };
    }, [app.workspace]);

    // Debounced rendering
    useEffect(() => {
        const render = () => {
            if (markdownRendererRef.current) {
                const html = markdownRendererRef.current.render(
                    markdownContent,
                    renderOptions
                );
                setRenderedHtml(html);
            }
        };

        const debouncedRender = debounce(render, 300);
        debouncedRender();

        return () => {
            // Cleanup if needed
        };
    }, [markdownContent, renderOptions]);

    // Handle copy to clipboard
    const handleCopy = useCallback(async () => {
        if (renderedHtml) {
            try {
                // Dynamically import juice to avoid bundling it if not used
                const juice = (await import('juice')).default;
                const inlinedHtml = juice(renderedHtml);

                // Create a ClipboardItem for richer content (HTML and plain text fallback)
                const blobHtml = new Blob([inlinedHtml], { type: 'text/html' });
                const blobText = new Blob([renderedHtml.replace(/<[^>]*>/g, '')], { type: 'text/plain' }); // Basic plain text fallback

                const item = new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText,
                });

                await navigator.clipboard.write([item]);
                console.log('Content copied to clipboard (HTML and plain text)! ');
            } catch (err) {
                console.error('Failed to copy content: ', err);
            }
        }
    }, [renderedHtml]);

    return (
        <div className="mpeasy-render-container flex h-full">
            <div className="mpeasy-preview-wrapper flex-grow p-4 overflow-auto">
                <Preview html={renderedHtml} onCopy={handleCopy} />
            </div>
            <div className="mpeasy-style-panel-wrapper w-64 p-4 border-l border-gray-200 dark:border-gray-700 overflow-auto">
                <StylePanel options={renderOptions} setOptions={setRenderOptions} />
            </div>
        </div>
    );
};

export default RenderContainer;
