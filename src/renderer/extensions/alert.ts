import { MarkedExtension } from 'marked';

export const markedAlert: MarkedExtension = {
    name: 'alert',
    level: 'block',
    start(src) {
        return src.match(/^[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)?.index;
    },
    tokenizer(src, tokens) {
        const rule = /^[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(.*)\n([\s\S]*?)(?:\n[ \t]*(?:\S|\s*$))?/i;
        const match = rule.exec(src);
        if (match) {
            const type = match[1].toLowerCase();
            const title = match[2].trim();
            const text = match[3] || '';
            return {
                type: 'alert',
                raw: match[0],
                alertType: type,
                alertTitle: title,
                tokens: this.lexer.blockTokens(text),
            };
        }
    },
    renderer(token) {
        const titleHtml = token.alertTitle ? `<p class="alert-title">${this.parser.parseInline(token.alertTitle)}</p>` : '';
        const bodyHtml = this.parser.parse(token.tokens);
        return `<div class="alert alert-${token.alertType}">
                    ${titleHtml}
                    <div class="alert-body">${bodyHtml}</div>
                </div>`;
    },
};