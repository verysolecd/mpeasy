import type { RendererObject, MarkedExtension, PropertiesHyphen } from 'marked';
import { Marked } from 'marked';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';
import type { IOpts, RendererAPI, Theme, ThemeStyles } from '../types';
import { customCssWithTemplate, css2json } from '../utils';
import { cloneDeep, toMerged } from 'es-toolkit';

import markedAlert from './MDAlert';
import markedFootnotes from './MDFootnotes';
import { MDKatex } from './MDKatex';
import markedSlider from './MDSlider';
import { markedToc } from './MDToc';

const fallbackTheme: Theme = {
    name: 'fallback',
    base: {},
    inline: {},
    block: {},
    styles: {},
};

export function getStyleString(style: PropertiesHyphen): string {
    if (!style) return '';
    return Object.entries(style)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');
}

function buildThemeStyles(theme: Theme, opts: Partial<IOpts>): ThemeStyles {
    const themeCopy = cloneDeep(theme);
    const base = toMerged(themeCopy.base, {
        'font-family': opts.fonts,
        'font-size': opts.size,
    });

    if (opts.isUseIndent) {
        themeCopy.block.p = {
            'text-indent': `2em`,
            ...themeCopy.block.p,
        };
    }

    const mergeStyles = (styles: Record<string, PropertiesHyphen>): Record<string, any> =>
        Object.fromEntries(
            Object.entries(styles || {}).map(([ele, style]) => [ele, toMerged(base, style)])
        );

    return {
        ...mergeStyles(themeCopy.inline),
        ...mergeStyles(themeCopy.block),
    } as ThemeStyles;
}

export function initRenderer(options: IOpts, iframeWindow: Window): RendererAPI {
    console.log('Initializing MPEasy Renderer v1.0.2'); // Debugging line
    let opts = options;
    let localMarked: Marked;

    const createMarkedInstance = (currentOpts: IOpts) => {
        const processedTheme = customCssWithTemplate(
            css2json(currentOpts.customCSS || ''),
            currentOpts.primaryColor || '#000000',
            currentOpts.theme || fallbackTheme
        );

        processedTheme.styles = buildThemeStyles(processedTheme, currentOpts);
        processedTheme.styles.inline = processedTheme.styles.inline || {};
        processedTheme.styles.block = processedTheme.styles.block || {};

        const renderer: RendererObject = {
            code(code, language) {
                if (code.lang === 'mermaid') {
                    // 对于 mermaid，我们使用占位符，实际的异步渲染在 parse 方法中处理
                    return `<div class="mermaid-async" data-mermaid-code="${encodeURIComponent(code.text)}">Loading mermaid diagram...</div>`;
                }
                const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
                const stringCode = String(code.text || '');
                const highlightedCode = hljs.highlight(stringCode, { language: validLanguage || 'plaintext' }).value;

                if (currentOpts.isMacCodeBlock) {
                    return `<style>.mac-sign{padding:10px 10px 0;text-align:left;border-top-left-radius:5px;border-top-right-radius:5px;background-color:#333;}.mac-sign-item{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;}.mac-sign-item.red{background-color:#ff5f56;}.mac-sign-item.yellow{background-color:#ffbd2e;}.mac-sign-item.green{background-color:#27c93f;}</style><pre class="hljs" style="margin-top:0;border-top-left-radius:0;border-top-right-radius:0;"><div class="mac-sign"><span class="mac-sign-item red"></span><span class="mac-sign-item yellow"></span><span class="mac-sign-item green"></span></div><code class="${validLanguage}">${highlightedCode}</code></pre>`;
                }

                return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
            },
            image(href: any, title: string | null, text: string): string {
                // 处理marked.js传递的对象类型href
                let imageUrl = '';
                if (typeof href === 'object' && href !== null) {
                    // marked.js可能传递包含href属性的对象
                    imageUrl = href.href || href.url || String(href) || '';
                } else if (typeof href === 'string') {
                    imageUrl = href;
                } else {
                    imageUrl = String(href || '');
                }
                
                if (!imageUrl) {
                    console.warn('Invalid image href:', href);
                    return `<span class="image-error">[Invalid image: ${text || ''}]</span>`;
                }
                
                // 处理 Obsidian 的 [[image.png]] 语法
                if (imageUrl.startsWith('[[') && imageUrl.endsWith(']]')) {
                    const imageName = imageUrl.slice(2, -2);
                    imageUrl = imageName;
                }
                
                // 处理 Obsidian 内部链接
                if (imageUrl.startsWith('app://')) {
                    return `<img src="${imageUrl}" alt="${text || ''}" title="${title || ''}" style="max-width: 100%; height: auto;" loading="lazy">`;
                }
                
                // 处理本地相对路径和网络图片
                return `<img src="${imageUrl}" alt="${text || ''}" title="${title || ''}" style="max-width: 100%; height: auto;" loading="lazy">`;
            },
        };

        const extensions: MarkedExtension[] = [
            markedAlert({ styles: processedTheme.styles }),
            markedFootnotes(),
            MDKatex(
                { styles: processedTheme.styles }, 
                getStyleString(processedTheme.styles.inline?.code),
                getStyleString(processedTheme.styles.block?.code),
                iframeWindow, 
                currentOpts.mathjaxPath
            ),
            markedSlider({ styles: processedTheme.styles }),
            markedToc(),
        ];

        return new Marked({ renderer, extensions, breaks: true, gfm: true, async: false });
    };

    // 缓存已加载的库
    let mermaidLoaded = false;
    let mathJaxLoaded = false;
    let mermaidReady = false;
    let mathJaxReady = false;

    localMarked = createMarkedInstance(opts);

    function setOptions(newOpts: Partial<IOpts>) {
        opts = { ...opts, ...newOpts };
        localMarked = createMarkedInstance(opts);
    }

    // 预加载资源
    async function preloadResources() {
        // 并行预加载Mermaid和MathJax
        const loadPromises = [];
        
        if (!mermaidLoaded && opts.mermaidPath) {
            loadPromises.push(
                new Promise<void>((resolve) => {
                    if (!iframeWindow.document.querySelector(`script[src="${opts.mermaidPath}"]`)) {
                        const script = iframeWindow.document.createElement('script');
                        script.src = opts.mermaidPath;
                        script.onload = () => {
                            mermaidLoaded = true;
                            resolve();
                        };
                        script.onerror = () => resolve(); // 失败也继续
                        iframeWindow.document.head.appendChild(script);
                    } else {
                        mermaidLoaded = true;
                        resolve();
                    }
                })
            );
        }

        if (!mathJaxLoaded && opts.mathjaxPath) {
            loadPromises.push(
                new Promise<void>((resolve) => {
                    if (!iframeWindow.document.querySelector(`script[src="${opts.mathjaxPath}"]`)) {
                        const script = iframeWindow.document.createElement('script');
                        script.src = opts.mathjaxPath;
                        script.onload = () => {
                            mathJaxLoaded = true;
                            resolve();
                        };
                        script.onerror = () => resolve(); // 失败也继续
                        iframeWindow.document.head.appendChild(script);
                    } else {
                        mathJaxLoaded = true;
                        resolve();
                    }
                })
            );
        }

        if (loadPromises.length > 0) {
            await Promise.allSettled(loadPromises);
        }
    }

    async function parse(markdown: string): Promise<string> {
        let html = localMarked.parse(markdown) as string;
        
        // 预加载资源
        await preloadResources();
        
        // 处理 mermaid 图表的异步渲染
        const mermaidRegex = /<div class="mermaid-async" data-mermaid-code="([^"]*)">Loading mermaid diagram...<\/div>/g;
        const mermaidMatches = [...html.matchAll(mermaidRegex)];
        
        if (mermaidMatches.length > 0) {
            try {
                // @ts-ignore
                let mermaid = iframeWindow.mermaid;
                if (!mermaid) {
                    console.warn('Mermaid library not found in iframe');
                    // 如果Mermaid不可用，直接显示代码
                    for (const match of mermaidMatches) {
                        const code = decodeURIComponent(match[1]);
                        html = html.replace(match[0], `<pre class="mermaid-fallback">${code}</pre>`);
                    }
                    return html;
                }

                // 检查Mermaid API结构
                console.log('Mermaid API available:', typeof mermaid.initialize, typeof mermaid.render);
                console.log('Mermaid object structure:', Object.keys(mermaid));
                console.log('Mermaid API:', mermaid);

                // 只初始化一次
                if (!mermaid._initialized) {
                    try {
                        const mermaidConfig = {
                            startOnLoad: false,
                            theme: opts.theme === 'dark' ? 'dark' : 'default',
                            securityLevel: 'loose',
                            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                            themeVariables: {
                                fontSize: '14px'
                            },
                            flowchart: { useMaxWidth: false, htmlLabels: false },
                            sequence: { useMaxWidth: false },
                            gantt: { useMaxWidth: false }
                        };

                        if (typeof mermaid.initialize === 'function') {
                            mermaid.initialize(mermaidConfig);
                        } else if (mermaid.default && typeof mermaid.default.initialize === 'function') {
                            // Handle possible default export
                            mermaid.default.initialize(mermaidConfig);
                            mermaid = mermaid.default; // Reassign
                        } else {
                            console.warn('Mermaid.initialize is not a function');
                        }
                        mermaid._initialized = true;
                    } catch (e) {
                        console.warn('Mermaid init failed:', e);
                        // Continue with default config even if init fails
                    }
                }

                // 批量处理所有mermaid图表
                for (const match of mermaidMatches) {
                    const code = decodeURIComponent(match[1]);
                    const id = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    
                    try {
                        let renderFunc = mermaid.render;
                        if (!renderFunc && mermaid.default && mermaid.default.render) {
                            renderFunc = mermaid.default.render;
                        }
                        
                        if (typeof renderFunc === 'function') {
                            const { svg } = await renderFunc.call(mermaid, id, code);
                            html = html.replace(match[0], `<div class="mermaid">${svg}</div>`);
                        } else {
                            console.warn('mermaid.render is not a function');
                            html = html.replace(match[0], `<pre class="mermaid-fallback">${code}</pre>`);
                        }
                    } catch (renderError) {
                        console.warn('Mermaid render failed:', renderError);
                        html = html.replace(match[0], `<pre class="mermaid-fallback">${code}</pre>`);
                    }
                }
            } catch (error) {
                console.error('Mermaid processing failed:', error);
                for (const match of mermaidMatches) {
                    const code = decodeURIComponent(match[1]);
                    html = html.replace(match[0], `<pre class="mermaid-error">Mermaid: ${error.message}</pre>`);
                }
            }
        }

        // 处理 MathJax 公式的异步渲染
        const katexRegex = /<span class="(inline-katex|block-katex)-placeholder" data-katex-text="([^"]*)" data-display="([^"]*)">Loading math...<\/span>/g;
        const katexMatches = [...html.matchAll(katexRegex)];
        
        for (const match of katexMatches) {
            const displayType = match[1];
            const encodedText = match[2];
            const display = match[3] === 'true';
            const text = decodeURIComponent(encodedText);
            
            try {
                // @ts-ignore
                const MathJax = iframeWindow.MathJax;
                if (!MathJax || !MathJax.tex2svg) {
                    // 如果MathJax不可用，直接显示原文本
                    html = html.replace(match[0], `<code>${text}</code>`);
                    continue;
                }

                try {
                    // 兼容CDN版本的MathJax
                    if (MathJax.texReset) MathJax.texReset();
                    const mjxContainer = MathJax.tex2svg(text, { display });
                    const svg = mjxContainer.firstChild || mjxContainer.querySelector('svg');
                    
                    if (!svg) {
                        throw new Error('No SVG element found');
                    }
                    
                    const width = svg.style?.['min-width'] || svg.getAttribute?.('width');
                    if (svg.removeAttribute) svg.removeAttribute('width');

                    svg.style = `max-width: 100%; height: auto;`;
                    if (width) svg.style.width = width;

                    let renderedHtml = display ? 
                        `<div class="math-block">${svg.outerHTML || svg.parentNode?.innerHTML}</div>` : 
                        `<span class="math-inline">${svg.outerHTML || svg.parentNode?.innerHTML}</span>`;
                    
                    html = html.replace(match[0], renderedHtml);
                } catch (renderError) {
                    console.warn('MathJax render failed, using fallback:', renderError);
                    html = html.replace(match[0], `<code>${text}</code>`);
                }
            } catch (error) {
                console.error('MathJax rendering failed:', error);
                html = html.replace(match[0], `<code>${text}</code>`);
            }
        }
        
        return html;
    }

    function parseFrontMatterAndContent(content: string) {
        const { attributes, body } = frontMatter(content);
        return { frontMatter: attributes, markdownContent: body };
    }

    return {
        parse,
        parseFrontMatterAndContent,
        setOptions,
    };
}