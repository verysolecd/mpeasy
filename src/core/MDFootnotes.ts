import type { MarkedExtension, Tokens } from 'marked'

interface MapContent {
  index: number
  text: string
}

export default function markedFootnotes(): MarkedExtension {
  // 将 fnMap 移入函数作用域，确保每个渲染器实例都有自己的状态
  const fnMap = new Map<string, MapContent>()

  return {
    name: 'mpeasy-footnotes',
    extensions: [
      {
        name: `footnoteDef`,
        level: `block`,
        start(src: string) {
          // 在每次解析开始时清空 map，以处理文件切换
          if (src.match(/^\s*\[\^/)) {
            fnMap.clear();
          }
          return src.match(/^\[\^/)?.index
        },
        tokenizer(src: string) {
          const match = src.match(/^\[\^(.*)\]:(.*)/)
          if (match) {
            const [raw, fnId, text] = match
            const index = fnMap.size + 1
            fnMap.set(fnId, { index, text })
            return {
              type: `footnoteDef`,
              raw,
              fnId,
              index,
              text,
            }
          }
          return undefined
        },
        renderer(token: Tokens.Generic) {
          const { index, text, fnId } = token as any;
          const fnInner = `
                <code>${index}.</code> 
                <span>${text}</span> 
                    <a id="fnDef-${fnId}" href="#fnRef-${fnId}" style="color: var(--md-primary-color);">\u21A9\uFE0E</a>
                <br>`
          if (index === 1) {
            return `
            <p style="font-size: 80%;margin: 0.5em 8px;word-break:break-all;">${fnInner}`
          }
          if (index === fnMap.size) {
            return `${fnInner}</p>`
          }
          return fnInner
        },
      },
      {
        name: `footnoteRef`,
        level: `inline`,
        start(src: string) {
          return src.match(/\[\^/)?.index
        },
        tokenizer(src: string) {
          const match = src.match(/^\[\^(.*?)\]/)
          if (match) {
            const [raw, fnId] = match
            if (fnMap.has(fnId)) {
              return {
                type: `footnoteRef`,
                raw,
                fnId,
              }
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const { fnId } = token as any;
          const content = fnMap.get(fnId) as MapContent
          if (!content) return token.raw;
          return `<sup style="color: var(--md-primary-color);">
                    <a href="#fnDef-${fnId}" id="fnRef-${fnId}">[${content.index}]</a>
                </sup>`
        },
      },
    ],
  }
}