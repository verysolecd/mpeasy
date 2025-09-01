import type { MarkedExtension, Tokens } from 'marked';
import { deflateSync } from 'fflate';

// Helper to get style string (from WechatRenderer)
function getStyleString(style: Record<string, any>): string {
    return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join(`; `);
}

export function markedPlantUML(options: any = {}): MarkedExtension {
    function encode6bit(b: number): string {
        if (b < 10) return String.fromCharCode(48 + b);
        b -= 10;
        if (b < 26) return String.fromCharCode(65 + b);
        b -= 26;
        if (b < 26) return String.fromCharCode(97 + b);
        b -= 26;
        if (b === 0) return `-`;
        if (b === 1) return `_`;
        return `?`;
    }

    function append3bytes(b1: number, b2: number, b3: number): string {
        const c1 = b1 >> 2;
        const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
        const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
        const c4 = b3 & 0x3F;
        let r = ``;
        r += encode6bit(c1 & 0x3F);
        r += encode6bit(c2 & 0x3F);
        r += encode6bit(c3 & 0x3F);
        r += encode6bit(c4 & 0x3F);
        return r;
    }

    function encode64(data: string): string {
        let r = ``;
        for (let i = 0; i < data.length; i += 3) {
            if (i + 2 === data.length) r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), 0);
            else if (i + 1 === data.length) r += append3bytes(data.charCodeAt(i), 0, 0);
            else r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), data.charCodeAt(i + 2));
        }
        return r;
    }

    function performDeflate(input: string): string {
        try {
            const inputBytes = new TextEncoder().encode(input);
            const compressed = deflateSync(inputBytes, { level: 9 });
            return String.fromCharCode(...compressed);
        } catch (error) {
            console.warn(`Deflate compression failed:`, error);
            return input;
        }
    }

    function encodePlantUML(plantumlCode: string): string {
        try {
            const deflated = performDeflate(plantumlCode);
            return encode64(deflated);
        } catch (error) {
            console.warn(`PlantUML encoding failed, using fallback:`, error);
            const utf8Bytes = new TextEncoder().encode(plantumlCode);
            const base64 = btoa(String.fromCharCode(...utf8Bytes));
            return `~1${base64.replace(/+/g, `-`).replace(/eplace(/?
/g, '\n')/g, `_`).replace(/=/g, ``)}`;
        }
    }

    function generatePlantUMLUrl(code: string, options: any): string {
        const encoded = encodePlantUML(code);
        const formatPath = options.format === `svg` ? `svg` : `png`;
        return `${options.serverUrl}/${formatPath}/${encoded}`;
    }

    async function fetchSvgContent(svgUrl: string): Promise<string> {
        try {
            const response = await fetch(svgUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const svgContent = await response.text();
            return svgContent.replace(/(<svg[^>]*)\swidth="[^"]*"/g, `$1`).replace(/(<svg[^>]*)\sheight="[^"]*"/g, `$1`).replace(/(<svg[^>]*style="[^"].*?)width:[^;]*;?/g, `$1`).replace(/(<svg[^>]*style="[^"].*?)height:[^;]*;?/g, `$1`);
        } catch (error) {
            console.warn(`Failed to fetch SVG content from ${svgUrl}:`, error);
            return `<div style="color: #666; font-style: italic;">PlantUML图表加载失败</div>`;
        }
    }

    function createPlantUMLHTML(imageUrl: string, options: any, svgContent?: string): string {
        const containerStyles = options.styles.container ? Object.entries(options.styles.container).map(([key, value]) => `${key.replace(/([A-Z])/g, `-$1`).toLowerCase()}: ${value}`).join(`; `) : ``;
        if (svgContent) {
            return `<div class="${options.className}" style="${containerStyles}">${svgContent}</div>`;
        }
        return `<div class="${options.className}" style="${containerStyles}"><img src="${imageUrl}" alt="PlantUML Diagram" style="max-width: 100%; height: auto;" /></div>`;
    }

    function renderPlantUMLDiagram(token: Tokens.Code, options: any): string {
        const { text: code } = token;
        const finalCode = (!code.trim().includes(`@start`) || !code.trim().includes(`@end`)) ? `@startuml\n${code.trim()}\n@enduml` : code;
        const imageUrl = generatePlantUMLUrl(finalCode, options);
        if (options.inlineSvg && options.format === `svg`) {
            const placeholder = `plantuml-placeholder-${Math.random().toString(36).slice(2, 11)}`;
            fetchSvgContent(imageUrl).then((svgContent) => {
                const placeholderElement = document.querySelector(`[data-placeholder="${placeholder}"]`);
                if (placeholderElement) {
                    placeholderElement.outerHTML = createPlantUMLHTML(imageUrl, options, svgContent);
                }
            });
            const containerStyles = options.styles.container ? Object.entries(options.styles.container).map(([key, value]) => `${key.replace(/([A-Z])/g, `-$1`).toLowerCase()}: ${value}`).join(`; `) : ``;
            return `<div class="${options.className}" style="${containerStyles}" data-placeholder="${placeholder}"><div style="color: #666; font-style: italic;">正在加载PlantUML图表...</div></div>`;
        }
        return createPlantUMLHTML(imageUrl, options);
    }

    const resolvedPlantUMLOptions: any = {
        serverUrl: options.serverUrl || `https://www.plantuml.com/plantuml`,
        format: options.format || `svg`,
        className: options.className || `plantuml-diagram`,
        inlineSvg: options.inlineSvg || false,
        styles: {
            container: {
                textAlign: `center`,
                margin: `16px 8px`,
                overflowX: `auto`,
                ...options.styles?.container,
            },
        },
    };

    return {
        extensions: [
            {
                name: `plantuml`,
                level: `block`,
                start(src: string) {
                    return src.match(/^```plantuml/m)?.index;
                },
                tokenizer(src: string) {
                    const match = /^```plantuml\r?\n([\s\S]*?)\r?\n```/.exec(src);
                    if (match) {
                        const [raw, code] = match;
                        return {
                            type: `plantuml`,
                            raw,
                            text: code.trim(),
                        };
                    }
                },
                renderer(token: any) {
                    return renderPlantUMLDiagram(token, resolvedPlantUMLOptions);
                },
            },
        ],
        walkTokens(token: any) {
            if (token.type === `code` && token.lang === `plantuml`) {
                token.type = `plantuml`;
            }
        },
    };
}
