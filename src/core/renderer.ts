import type { PropertiesHyphen } from 'csstype'
import type { RendererObject, Tokens, MarkedExtension } from 'marked'
import { cloneDeep, toMerged } from 'es-toolkit'
import frontMatter from 'front-matter'
import hljs from 'highlight.js'
import { marked } from 'marked'
import mermaid from 'mermaid'
import readingTime from 'reading-time'
import type { IOpts, ThemeStyles, RendererAPI, ReadingTimeResults } from '../../types'

import markedAlert from './MDAlert'
import markedFootnotes from './MDFootnotes'
import { MDKatex } from './MDKatex'
import markedSlider from './MDSlider'
import { markedToc } from './MDToc'

// Helper function from the original project, we need to define it or import it.
export function getStyleString(style: PropertiesHyphen): string {
    return Object.entries(style)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');
}

marked.setOptions({
  breaks: true,
})

function buildTheme({ theme: _theme, fonts, size, isUseIndent }: IOpts): ThemeStyles {
  const theme = cloneDeep(_theme)
  const base = toMerged(theme.base, {
    'font-family': fonts,
    'font-size': size,
  })

  if (isUseIndent) {
    theme.block.p = {
      'text-indent': `2em`,
      ...theme.block.p,
    }
  }

  const mergeStyles = (styles: Record<string, PropertiesHyphen>): Record<string, any> =>
    Object.fromEntries(
      Object.entries(styles).map(([ele, style]) => [ele, toMerged(base, style)]),
    )
  return {
    ...mergeStyles(theme.inline),
    ...mergeStyles(theme.block),
  } as ThemeStyles
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`) 
    .replace(/</g, `&lt;`) 
    .replace(/>/g, `&gt;`) 
    .replace(/