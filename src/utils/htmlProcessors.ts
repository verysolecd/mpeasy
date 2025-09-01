
// Ported HTML processing functions from refmd's web app utils
// These functions are used for post-rendering HTML manipulation, especially for copy/export.

import juice from 'juice';
import { Marked } from 'marked';
import { markedAlert, MDKatex } from './WechatRenderer'; // Re-use our ported extensions

// Helper to get computed styles (simplified for browser environment)
function getElementStyles(element: Element, excludes = [`width`, `height`, `inlineSize`, `webkitLogicalWidth`, `webkitLogicalHeight`]): string {
  const styles = window.getComputedStyle(element, null);
  return Array.from(styles)
    .filter(
      (key) => {
        const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
        return styles.getPropertyValue(kebabKey) && !excludes.includes(key);
      },
    )
    .map((key) => {
      const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
      return `${kebabKey}:${styles.getPropertyValue(key)};`;
    })
    .join(``);
}

// Helper to check if element is pre with code__pre class
function isPre(element: Element) {
  return (
    element.tagName === `PRE`
    && Array.from(element.classList).includes(`code__pre`)
  );
}

// Helper to check if element is code
function isCode(element: Element | null) {
  if (element == null) return false;
  return element.tagName === `CODE`;
}

// Helper to check if element is span wrapping code
function isSpan(element: Element) {
  return (
    element.tagName === `SPAN`
    && (isCode(element.parentElement)
      || isCode((element.parentElement!).parentElement))
  );
}

/**
 * Recursively sets inline styles on elements based on their computed styles.
 * Used by refmd for export to ensure styles are preserved.
 * @param element - The DOM element to process.
 */
export function setStyles(element: Element) {
  switch (true) {
    case isPre(element):
    case isCode(element):
    case isSpan(element):
      element.setAttribute(`style`, getElementStyles(element));
      break;
  }
  if (element.children.length) {
    Array.from(element.children).forEach(child => setStyles(child));
  }
}

/**
 * Processes HTML content, applying styles and color variables for display/copy.
 * This is a simplified version of refmd's processHtmlContent.
 * @param htmlString - The HTML string to process.
 * @param primaryColor - The primary color to replace --md-primary-color.
 * @returns Processed HTML string.
 */
export function processHtmlContent(htmlString: string, primaryColor: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;

  // Apply computed styles as inline styles (recursive)
  setStyles(tempDiv);

  // Replace color variables (simplified)
  return tempDiv.innerHTML
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``);
}

/**
 * Gets highlight.js styles from the DOM (simplified).
 * In refmd, this fetches the CSS from a <link> tag.
 * Here, we assume the CSS is already loaded or will be provided.
 * For copy, we will rely on the CSS content passed to juice.
 */
export async function getHljsStyles(): Promise<string> {
  // This function is primarily for refmd's internal display logic.
  // For copy, we get the CSS content directly from the plugin's assets.
  return ''; // Placeholder for now
}

/**
 * Merges CSS into HTML using juice.
 * @param html - HTML string.
 * @returns Juiced HTML string.
 */
export function mergeCss(html: string): string {
  return juice(html, {
    inlinePseudoElements: true,
    preserveImportant: true,
  });
}

/**
 * Modifies HTML structure for compatibility (e.g., moving list items).
 * @param htmlString - HTML string.
 * @returns Modified HTML string.
 */
export function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`);
  tempDiv.innerHTML = htmlString;

  // Move `li > ul` and `li > ol` to `li` after
  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem);
  });

  return tempDiv.innerHTML;
}

/**
 * Creates an empty node for compatibility (e.g., for SVG copy).
 */
export function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`);
  node.style.fontSize = `0`;
  node.style.lineHeight = `0`;
  node.style.margin = `0`;
  node.innerHTML = `&nbsp;`;
  return node;
}

/**
 * Solves WeChat image issues (e.g., setting width/height as style).
 * @param htmlString - HTML string to process.
 * @returns Processed HTML string.
 */
export function solveWeChatImage(htmlString: string): string {
  const tempDiv = document.createElement(`div`);
  tempDiv.innerHTML = htmlString;
  const images = tempDiv.getElementsByTagName(`img`);

  Array.from(images).forEach((image) => {
    const width = image.getAttribute(`width`);
    const height = image.getAttribute(`height`);
    if (width) {
      image.removeAttribute(`width`);
      image.style.width = width;
    }
    if (height) {
      image.removeAttribute(`height`);
      image.style.height = height;
    }
  });
  return tempDiv.innerHTML;
}

/**
 * Main function for processing HTML for clipboard copy.
 * This combines several steps from refmd's processClipboardContent.
 * @param htmlString - The HTML string to process.
 * @param primaryColor - The primary color for variable replacement.
 * @param hljsCssContent - The highlight.js CSS content to inline.
 * @returns Final HTML string ready for clipboard.
 */
export async function processClipboardContent(htmlString: string, primaryColor: string, hljsCssContent: string): Promise<string> {
  let processedHtml = htmlString;

  // 1. Add highlight.js styles
  if (hljsCssContent) {
    processedHtml = `<style>${hljsCssContent}</style>` + processedHtml;
  }

  // 2. Merge CSS and modify structure
  processedHtml = modifyHtmlStructure(mergeCss(processedHtml));

  // 3. Replace color variables
  processedHtml = processedHtml
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`) // Simplified for copy
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`) // Simplified for copy
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``);

  // 4. Handle image sizes
  processedHtml = solveWeChatImage(processedHtml);

  // 5. Add empty nodes for compatibility (simplified)
  // This part is tricky without a live DOM. We'll just add them to the string.
  const emptyNodeHtml = `<p style="font-size:0;line-height:0;margin:0;">&nbsp;</p>`;
  processedHtml = emptyNodeHtml + processedHtml + emptyNodeHtml;

  // 6. Compatibility for Mermaid (simplified)
  // This requires DOM manipulation on the actual clipboard content, which is hard here.
  // We'll skip this for now or rely on the browser's clipboard handling.

  return processedHtml;
}

/**
 * Post-processes HTML after marked rendering for display.
 * This is a simplified version of refmd's postProcessHtml.
 * @param htmlString - The HTML string from marked.
 * @param readingTimeResult - Reading time data (not used in this simplified version).
 * @param rendererInstance - The renderer instance (not used in this simplified version).
 * @returns Post-processed HTML string.
 */
export function postProcessHtml(htmlString: string, readingTimeResult: any, rendererInstance: any): string {
  // In refmd, this extracts headings for TOC and adds reading time block.
  // We will just return the htmlString for now, as TOC is handled by markedToc extension.
  // Reading time block can be added later if needed.
  return htmlString;
}
