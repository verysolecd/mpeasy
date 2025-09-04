import { MarkedExtension } from 'marked';

// This is a simplified example. A full Katex extension would involve
// parsing math blocks/inlines and rendering them using MathJax/Katex library.
// For now, it will just wrap the content in a span/div with a class.

export const markedKatex: MarkedExtension = {
    name: 'katex',
    level: 'inline',
    start(src) {
        return src.match(/\$[^\s]/)?.index;
    },
    tokenizer(src, tokens) {
        const inlineRule = /^\$([^\s$](?:[^$]*[^\s$])?)\$/;
        const blockRule = /^\$\$([\s\S]*?)\$\$/;

        let match = blockRule.exec(src);
        if (match) {
            return {
                type: 'katex',
                raw: match[0],
                formula: match[1],
                displayMode: true,
            };
        }

        match = inlineRule.exec(src);
        if (match) {
            return {
                type: 'katex',
                raw: match[0],
                formula: match[1],
                displayMode: false,
            };
        }
    },
    renderer(token) {
        if (token.displayMode) {
            return `<div class="math-block">${token.formula}</div>`;
        } else {
            return `<span class="math-inline">${token.formula}</span>`;
        }
    },
};
