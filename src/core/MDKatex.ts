const inlineRule = /^(\$){1,2}(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1(?=[\s?!.,:？！。，：]|$)/;
const inlineRuleNonStandard = /^(\$){1,2}(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1/;
const blockRule = /^\s{0,3}(\$){1,2}[ \t]*\n([\s\S]+?)\n\s{0,3}\1[ \t]*(?:\n|$)/;

function createRenderer(display, inlineStyle, blockStyle, iframeWindow, mathjaxPath) {
  return (token) => {
    // 使用占位符，实际的异步渲染在 parse 方法后处理中处理
    const displayClass = display ? 'block-katex' : 'inline-katex';
    return `<span class="${displayClass}-placeholder" data-katex-text="${encodeURIComponent(token.text)}" data-display="${display}">Loading math...</span>`;
  }
}

function inlineKatex(options, renderer) {
  const nonStandard = options && options.nonStandard
  const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule
  return {
    name: `inlineKatex`,
    level: `inline`,
    start(src) {
      let index
      let indexSrc = src

      while (indexSrc) {
        index = indexSrc.indexOf(`$`)
        if (index === -1) {
          return
        }
        const f = nonStandard ? index > -1 : index === 0 || indexSrc.charAt(index - 1) === ` `
        if (f) {
          const possibleKatex = indexSrc.substring(index)

          if (possibleKatex.match(ruleReg)) {
            return index
          }
        }

        indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, ``)
      }
    },
    tokenizer(src) {
      const match = src.match(ruleReg)
      if (match) {
        return {
          type: `inlineKatex`,
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2,
        }
      }
    },
    renderer,
  }
}

function blockKatex(options, renderer) {
  return {
    name: `blockKatex`,
    level: `block`,
    tokenizer(src) {
      const match = src.match(blockRule)
      if (match) {
        return {
          type: `blockKatex`,
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2,
        }
      }
    },
    renderer,
  }
}

export function MDKatex(options, inlineStyle, blockStyle, iframeWindow, mathjaxPath) {
  return {
    name: 'katex',
    extensions: [
      inlineKatex(options, createRenderer(false, inlineStyle, blockStyle, iframeWindow, mathjaxPath)),
      blockKatex(options, createRenderer(true, inlineStyle, blockStyle, iframeWindow, mathjaxPath)),
    ],
  }
}