const inlineRule = /^(\$){1,2}(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1/;
const blockRule = /^\s{0,3}(\$){1,2}[ \t]*\n([\s\S]+?)\n\s{0,3}\1[ \t]*(?:\n|$)/;

function createRenderer(display, inlineStyle, blockStyle, iframeWindow) {
  return (token) => {
    if (!iframeWindow || !iframeWindow.MathJax) {
      const displayClass = display ? 'block-katex' : 'inline-katex';
      return `<span class="${displayClass}-placeholder" data-katex-text="${encodeURIComponent(token.text)}" data-display="${display}">Loading math...</span>`;
    }

    iframeWindow.MathJax.texReset();
    const mjxContainer = iframeWindow.MathJax.tex2svg(token.text, { display });
    const svg = mjxContainer.firstChild as SVGSVGElement;

    // --- Start of refmd porting ---
    // Get the global glyph definitions and styles to create a self-contained SVG
    const defs = iframeWindow.document.getElementById('MathJax_SVG_glyphs');
    const styles = iframeWindow.document.getElementById('MathJax-SVG-styles');

    const selfContainedSvg = svg.cloneNode(true) as SVGSVGElement;
    let defsElement = selfContainedSvg.querySelector('defs');
    if (!defsElement) {
        defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        selfContainedSvg.insertBefore(defsElement, selfContainedSvg.firstChild);
    }

    if (defs) {
        defsElement.innerHTML += defs.innerHTML;
    }
    if (styles) {
        const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleElement.textContent = styles.textContent;
        defsElement.appendChild(styleElement);
    }
    // --- End of refmd porting ---

    if (!display) {
      return `<span ${inlineStyle}>${selfContainedSvg.outerHTML}</span>`;
    }

    return `<section ${blockStyle}>${selfContainedSvg.outerHTML}</section>`;
  }
}

function inlineKatex(options, renderer) {
  return {
    name: 'inlineKatex',
    level: 'inline',
    start(src) {
      const match = src.match(inlineRule);
      if (match) {
        return match[0].length;
      }
    },
    tokenizer(src) {
      const match = src.match(inlineRule);
      if (match) {
        return {
          type: 'inlineKatex',
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2,
        };
      }
    },
    renderer,
  };
}

function blockKatex(options, renderer) {
  return {
    name: 'blockKatex',
    level: 'block',
    start(src) {
        const match = src.match(blockRule);
        if (match) {
            return match[0].length;
        }
    },
    tokenizer(src) {
      const match = src.match(blockRule);
      if (match) {
        return {
          type: 'blockKatex',
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2,
        };
      }
    },
    renderer,
  };
}

export function MDKatex(options, inlineStyle, blockStyle, iframeWindow) {
  return {
    name: 'katex',
    extensions: [
      inlineKatex(options, createRenderer(false, inlineStyle, blockStyle, iframeWindow)),
      blockKatex(options, createRenderer(true, inlineStyle, blockStyle, iframeWindow)),
    ],
  };
}
