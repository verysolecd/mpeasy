import type { PropertiesHyphen } from 'csstype';
import type { Theme, Block, Inline } from './types';
import juice from 'juice';

// This is a direct port of the essential styling utilities from the onlyref project.

export function customizeTheme(theme: Theme, options: {
  fontSize?: number;
  color?: string;
}) {
  const newTheme = JSON.parse(JSON.stringify(theme));
  const { fontSize, color } = options;
  if (fontSize) {
    for (let i = 1; i <= 6; i++) {
      const v = newTheme.block[`h${i}`][`font-size`];
      newTheme.block[`h${i}`][`font-size`] = `${fontSize * Number.parseFloat(v)}px`;
    }
  }
  if (color) {
    newTheme.base[`--md-primary-color`] = color;
  }
  return newTheme as Theme;
}

export function customCssWithTemplate(jsonString: Partial<Record<Block | Inline, PropertiesHyphen>>, color: string, theme: Theme) {
  const newTheme = customizeTheme(theme, { color });

  const mergeProperties = <T extends Block | Inline = Block>(target: Record<T, PropertiesHyphen>, source: Partial<Record<Block | Inline, PropertiesHyphen>>, keys: T[]) => {
    keys.forEach((key) => {
      if (source[key]) {
        target[key] = Object.assign(target[key] || {}, source[key]);
      }
    });
  };

  const blockKeys: Block[] = [
    `container`,
    `h1`,
    `h2`,
    `h3`,
    `h4`,
    `h5`,
    `h6`,
    `code`,
    `code_pre`,
    `p`,
    `hr`,
    `blockquote`,
    `blockquote_p`,
    `blockquote_title`,
    `image`,
    `ul`,
    `ol`,
    `block_katex`,
  ];
  const inlineKeys: Inline[] = [`listitem`, `codespan`, `link`, `wx_link`, `strong`, `table`, `thead`, `td`, `footnote`, `figcaption`, `em`, `inline_katex`];

  mergeProperties(newTheme.block, jsonString, blockKeys);
  mergeProperties(newTheme.inline, jsonString, inlineKeys);
  return newTheme;
}

export function css2json(css: string): Partial<Record<Block | Inline, PropertiesHyphen>> {
  css = css.replace(/\/\*[\s\S]*?\*\//g, ``);

  const json: Partial<Record<Block | Inline, PropertiesHyphen>> = {};

  const toObject = (array: any[]) =>
    array.reduce<{ [k: string]: string }>((obj, item) => {
      const [property, ...value] = item.split(`:`).map((part: string) => part.trim());
      if (property) {
        obj[property] = value.join(`:`);
      }
      return obj;
    }, {});

  while (css.includes(`{`) && css.includes(`}`)) {
    const lbracket = css.indexOf(`{`);
    const rbracket = css.indexOf(`}`);

    const declarations = css.substring(lbracket + 1, rbracket)
      .split(`;`)
      .map(e => e.trim())
      .filter(Boolean);

    const selectors = css.substring(0, lbracket)
      .split(`,`)
      .map(selector => selector.trim()) as (Block | Inline)[];

    const declarationObj = toObject(declarations);

    selectors.forEach((selector) => {
      json[selector] = { ...(json[selector] || {}), ...declarationObj };
    });

    css = css.slice(rbracket + 1).trim();
  }

  return json;
}

function mergeCss(html: string, extraCss: string): string {
  return juice(html, {
    extraCss,
    inlinePseudoElements: true,
    preserveImportant: true,
  });
}

function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`);
  tempDiv.innerHTML = htmlString;

  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem);
  });

  return tempDiv.innerHTML;
}

function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`);
  node.style.fontSize = `0`;
  node.style.lineHeight = `0`;
  node.style.margin = `0`;
  node.innerHTML = `&nbsp;`;
  return node;
}

export function processClipboardContent(clipboardDiv: HTMLElement, primaryColor: string, extraCss: string) {
  clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML, extraCss));

  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`)
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`)
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
    .replace(
      /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="nodeLabel"$1>$2</span>`,
    )
    .replace(
      /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="edgeLabel"$1>$2</span>`,
    );

  const beforeNode = createEmptyNode();
  const afterNode = createEmptyNode();
  clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild);
  clipboardDiv.appendChild(afterNode);
}

import fs from 'fs';
import path from 'path';

let themeDir = '';
let styleDir = '';

export function setBasePath(themePath: string, stylePath: string) {
    themeDir = themePath;
    styleDir = stylePath;
}

export const getLayoutThemes = () => {
  try {
    const files = fs.readdirSync(themeDir);
    return files
      .filter(file => file.endsWith('.css'))
      .map(file => {
        const name = file.replace('.css', '');
        return {
          name,
          css: fs.readFileSync(path.join(themeDir, file), 'utf-8'),
        };
      });
  } catch (error) {
    console.error('Failed to read themes directory:', error);
    return [];
  }
};

export const loadLayoutTheme = (name: string) => {
  if (!name) {
    console.error('loadLayoutTheme called with undefined name');
    return '';
  }
  try {
    const themePath = path.join(themeDir, `${name}.css`);
    return fs.readFileSync(themePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load layout theme ${name}:`, error);
    return '';
  }
};

export const getCodeBlockThemes = () => {
  try {
    const files = fs.readdirSync(styleDir);
    return files
      .filter(file => file.endsWith('.css'))
      .map(file => {
        const name = file.replace('.css', '');
        return {
          name,
          css: fs.readFileSync(path.join(styleDir, file), 'utf-8'),
        };
      });
  } catch (error) {
    console.error('Failed to read styles directory:', error);
    return [];
  }
};

export const loadCodeBlockTheme = (name: string) => {
  if (!name) {
    console.error('loadCodeBlockTheme called with undefined name');
    return '';
  }
  try {
    const themePath = path.join(styleDir, `${name}.css`);
    return fs.readFileSync(themePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load code block theme ${name}:`, error);
    return '';
  }
};
