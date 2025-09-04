import { MarkedExtension } from 'marked';

export const markedFootnotes: MarkedExtension = {
    name: 'footnotes',
    level: 'block',
    start(src) {
        return src.match(/^\s*\[\^([^\]]+)\]:/)?.index;
    },
    tokenizer(src, tokens) {
        const rule = /^\s*\[\^([^\]]+)\]:([\s\S]*?)(?=\n\s*\[\^|$)/;
        const match = rule.exec(src);
        if (match) {
            const id = match[1];
            const text = match[2].trim();
            return {
                type: 'footnote',
                raw: match[0],
                id: id,
                tokens: this.lexer.blockTokens(text),
            };
        }
    },
    renderer(token) {
        const bodyHtml = this.parser.parse(token.tokens);
        return `<div class="footnote-item" id="fn-${token.id}">
                    <sup class="footnote-ref"><a href="#fnref-${token.id}"><sup>[${token.id}]</sup></a></sup>
                    <div class="footnote-body">${bodyHtml}</div>
                </div>`;
    },
};

// Inline footnote reference
export const markedFootnoteRef: MarkedExtension = {
    name: 'footnoteRef',
    level: 'inline',
    start(src) {
        return src.match(/\[\[\^([^\]]+)\](?!:)/)?.index;
    },
    tokenizer(src, tokens) {
        const rule = /^\s*\[\^([^\]]+)\](?!:)/;
        const match = rule.exec(src);
        if (match) {
            const id = match[1];
            return {
                type: 'footnoteRef',
                raw: match[0],
                id: id,
            };
        }
    },
    renderer(token) {
        return `<sup class="footnote-ref" id="fnref-${token.id}"><a href="#fn-${token.id}"><sup>[${token.id}]</sup></a></sup>`;
    },
};
