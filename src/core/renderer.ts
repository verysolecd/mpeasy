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

    localMarked = createMarkedInstance(opts);

    function setOptions(newOpts: Partial<IOpts>) {
        opts = { ...opts, ...newOpts };
        localMarked = createMarkedInstance(opts);
    }

    async function parse(markdown: string): Promise<string> {
        let html = localMarked.parse(markdown) as string;
        
        // 处理 mermaid 图表的异步渲染
        const mermaidRegex = /<div class="mermaid-async" data-mermaid-code="([^"]*)">Loading mermaid diagram...<\/div>/g;
        const mermaidMatches = [...html.matchAll(mermaidRegex)];
        
        for (const match of mermaidMatches) {
            const encodedCode = match[1];
            const code = decodeURIComponent(encodedCode);
            
            try {
                // 确保 mermaid.js 脚本在 iframe 内部加载
                if (!iframeWindow.document.querySelector('script[src="' + opts.mermaidPath + '"]')) {
                    await new Promise((resolve, reject) => {
                        const script = iframeWindow.document.createElement('script');
                        script.src = opts.mermaidPath;
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load mermaid.js'));
                        iframeWindow.document.head.appendChild(script);
                    });
                }

                // 等待 Mermaid 库完全加载并初始化
                await new Promise(resolve => {
                    const checkMermaid = () => {
                        // @ts-ignore
                        if (iframeWindow.mermaid) {
                            resolve(undefined);
                        } else {
                            setTimeout(checkMermaid, 10);
                        }
                    };
                    checkMermaid();
                });

                // @ts-ignore
                const mermaid = iframeWindow.mermaid;
                console.log('iframeWindow.mermaid object:', mermaid); // Debugging line
                console.log('iframeWindow.mermaid object keys:', Object.keys(mermaid || {})); // More debugging
                
                // 更完善的Mermaid API兼容性处理
                try {
                    let mermaidInstance = null;
                    let renderFunction = null;
                    let initializeFunction = null;
                    
                    // 调试：输出mermaid对象结构
                    console.log('iframeWindow.mermaid object:', mermaid);
                    console.log('iframeWindow.mermaid object keys:', Object.keys(mermaid || {}));
                    
                    // 检查window.mermaid（全局变量）
                    if (mermaid) {
                        // 直接访问主mermaid对象
                        if (typeof mermaid.initialize === 'function' && typeof mermaid.mermaidAPI?.render === 'function') {
                            mermaidInstance = mermaid;
                            initializeFunction = mermaid.initialize;
                            renderFunction = mermaid.mermaidAPI.render;
                        }
                        // 尝试访问mermaid.mermaidAPI
                        else if (mermaid.mermaidAPI && typeof mermaid.mermaidAPI.initialize === 'function' && typeof mermaid.mermaidAPI.render === 'function') {
                            mermaidInstance = mermaid.mermaidAPI;
                            initializeFunction = mermaid.mermaidAPI.initialize;
                            renderFunction = mermaid.mermaidAPI.render;
                        }
                        // 尝试直接访问render函数
                        else if (typeof mermaid.render === 'function') {
                            mermaidInstance = mermaid;
                            initializeFunction = mermaid.initialize || (() => {});
                            renderFunction = mermaid.render;
                        }
                        // 尝试访问default属性
                        else if (mermaid.default && typeof mermaid.default.initialize === 'function' && typeof mermaid.default.render === 'function') {
                            mermaidInstance = mermaid.default;
                            initializeFunction = mermaid.default.initialize;
                            renderFunction = mermaid.default.render;
                        }
                    }
                    
                    // 如果仍然找不到，尝试通过window访问
                    if (!mermaidInstance && iframeWindow.window && iframeWindow.window.mermaid) {
                        const winMermaid = iframeWindow.window.mermaid;
                        if (typeof winMermaid.initialize === 'function' && typeof winMermaid.mermaidAPI?.render === 'function') {
                            mermaidInstance = winMermaid;
                            initializeFunction = winMermaid.initialize;
                            renderFunction = winMermaid.mermaidAPI.render;
                        } else if (winMermaid.mermaidAPI && typeof winMermaid.mermaidAPI.initialize === 'function' && typeof winMermaid.mermaidAPI.render === 'function') {
                            mermaidInstance = winMermaid.mermaidAPI;
                            initializeFunction = winMermaid.mermaidAPI.initialize;
                            renderFunction = winMermaid.mermaidAPI.render;
                        } else if (typeof winMermaid.render === 'function') {
                            mermaidInstance = winMermaid;
                            initializeFunction = winMermaid.initialize || (() => {});
                            renderFunction = winMermaid.render;
                        }
                    }
                    
                    if (mermaidInstance && initializeFunction && renderFunction) {
                        console.log('Successfully identified Mermaid API structure:', { mermaidInstance, initializeFunction, renderFunction }); // Debugging
                        // 调用初始化函数
                        initializeFunction.call(mermaidInstance, { startOnLoad: false });
                        // 调用渲染函数
                        const { svg } = await renderFunction.call(mermaidInstance, 'mermaid-' + Date.now(), code);
                        html = html.replace(match[0], `<div class="mermaid">${svg}</div>`);
                    } else {
                        // 如果以上方法都失败，尝试直接调用 mermaid.default (如果它是一个函数)
                        if (mermaid && typeof mermaid.default === 'function') {
                            console.log('Attempting to use mermaid.default as a function'); // Debugging
                            try {
                                const { svg } = await mermaid.default(code);
                                html = html.replace(match[0], `<div class="mermaid">${svg}</div>`);
                                continue; // 成功渲染，继续下一个图表
                            } catch (directCallError) {
                                console.error('Direct call to mermaid.default failed:', directCallError);
                            }
                        }
                        // 如果所有方法都失败，抛出一个带有更多信息的错误
                        const errorMessage = `无法识别Mermaid API结构。已尝试的结构: ${[
                            'mermaid',
                            'mermaid.mermaidAPI',
                            'mermaid.default (object with initialize/render)',
                            'mermaid.default.mermaidAPI',
                            'mermaid.default.default',
                            'mermaid.default (function with initialize/render)',
                            'mermaid.default() (function call)'
                        ].join(', ')}.`;
                        console.error(errorMessage);
                        throw new Error(errorMessage);
                    }
                } catch (apiError) {
                    console.error('Mermaid API调用失败:', apiError);
                    // 降级处理：在iframe中动态创建一个<script>标签来执行Mermaid代码
                    // 这种方式可以确保Mermaid库在正确的上下文中运行
                    const id = 'mermaid-' + Date.now();
                    const scriptContent = `
                        if (typeof mermaid !== 'undefined') {
                            try {
                                mermaid.initialize({ startOnLoad: true });
                                mermaid.run({
                                    querySelector: '#${id}'
                                });
                            } catch (initError) {
                                console.error('Mermaid初始化失败:', initError);
                            }
                        }
                    `;
                    
                    html = html.replace(match[0], `
                        <div class="mermaid" id="${id}">${code}</div>
                        <script>${scriptContent}</script>
                    `);
                }
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
                html = html.replace(match[0], `<pre class="mermaid-error">Mermaid rendering failed: ${error.message}</pre>`);
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
                if (!iframeWindow.MathJax) {
                    await new Promise((resolve, reject) => {
                        const script = iframeWindow.document.createElement('script');
                        script.src = opts.mathjaxPath;
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load MathJax'));
                        iframeWindow.document.head.appendChild(script);
                    });
                }
                // @ts-ignore
                iframeWindow.MathJax.texReset();
                // @ts-ignore
                const mjxContainer = iframeWindow.MathJax.tex2svg(text, { display });
                const svg = mjxContainer.firstChild;
                const width = svg.style['min-width'] || svg.getAttribute('width');
                svg.removeAttribute('width');

                svg.style = `max-width: 300vw !important; display: initial; flex-shrink: 0;`;
                svg.style.width = width;

                let renderedHtml;
                if (!display) {
                    renderedHtml = `<span>${svg.outerHTML}</span>`;
                } else {
                    renderedHtml = `<section>${svg.outerHTML}</section>`;
                }
                
                html = html.replace(match[0], renderedHtml);
            } catch (error) {
                console.error('MathJax rendering failed:', error);
                html = html.replace(match[0], `<pre class="mathjax-error">MathJax rendering failed: ${error.message}</pre>`);
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