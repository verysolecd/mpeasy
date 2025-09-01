import type { MarkedExtension } from 'marked';

export function MDKatex(options: any, inlineStyle: string, blockStyle: string): MarkedExtension {
    const inlineRule = /^(\\${1,2})(?!\\\\$)(?:\\.|[^\\n\\\\])*?(?:\\.|[^\\n\\$])\\1(?=[\s?!.,:？！。，：]|$)/;
    const inlineRuleNonStandard = /^(\\${1,2})(?!\\\\$)(?:\\.|[^\\n\\\\])*?(?:\\.|[^\\n\\$])\\1/;
    const blockRule = /^\s{0,3}(\\${1,2})[ \t]*\n([\s\S]+?)\n\s{0,3}\\1[ \t]*(?:\n|$)/;

    function createRenderer(display: boolean, inlineStyle: string, blockStyle: string) {
        return (token: any) => {
            // @ts-ignore MathJax is a global variable
            window.MathJax.texReset();
            // @ts-ignore MathJax is a global variable
            const mjxContainer = window.MathJax.tex2svg(token.text, { display });
            const svg = mjxContainer.firstChild;
            const width = svg.style[`min-width`] || svg.getAttribute(`width`);
            svg.removeAttribute(`width`);
            svg.style = `max-width: 300vw !important; display: initial; flex-shrink: 0;`;
            svg.style.width = width;
            if (!display) {
                return `<span ${inlineStyle}>${svg.outerHTML}</span>`;
            }
            return `<section ${blockStyle}>${svg.outerHTML}</section>`;
        };
    }

    function inlineKatex(options: any, renderer: any) {
        const nonStandard = options && options.nonStandard;
        const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule;
        return {
            name: `inlineKatex`,
            level: `inline`,
            start(src: string) {
                let index;
                let indexSrc = src;
                while (indexSrc) {
                    index = indexSrc.indexOf(`$`);
                    if (index === -1) return;
                    const f = nonStandard ? index > -1 : index === 0 || indexSrc.charAt(index - 1) === ` `;
                    if (f) {
                        const possibleKatex = indexSrc.substring(index);
                        if (possibleKatex.match(ruleReg)) return index;
                    }
                    indexSrc = indexSrc.substring(index + 1).replace(/^\\$+/, ``);
                }
            },
            tokenizer(src: string) {
                const match = src.match(ruleReg);
                if (match) {
                    return {
                        type: `inlineKatex`,
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
            },
            renderer,
        };
    }

    function blockKatex(_options: any, renderer: any) {
        return {
            name: `blockKatex`,
            level: `block`,
            tokenizer(src: string) {
                const match = src.match(blockRule);
                if (match) {
                    return {
                        type: `blockKatex`,
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
            },
            renderer,
        };
    }

    return {
        extensions: [
            inlineKatex(options, createRenderer(false, inlineStyle, blockStyle)),
            blockKatex(options, createRenderer(true, inlineStyle, blockStyle)),
        ],
    };
}
