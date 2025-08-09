import type { PropertiesHyphen } from 'csstype';
import type { Block, ExtendedProperties, Inline, Theme } from '../types';

export function customizeTheme(theme: Theme, options: {
  fontSize?: number
  color?: string
}) {
  const newTheme = JSON.parse(JSON.stringify(theme))
  const { fontSize, color } = options
  if (fontSize) {
    for (let i = 1; i <= 6; i++) {
      const v = newTheme.block[`h${i}`][`font-size`]
      newTheme.block[`h${i}`][`font-size`] = `${fontSize * Number.parseFloat(v)}px`
    }
  }
  if (color) {
    newTheme.base[`--md-primary-color`] = color
  }
  return newTheme as Theme
}

export function customCssWithTemplate(jsonString: Partial<Record<Block | Inline, PropertiesHyphen>>, color: string, theme: Theme) {
  const newTheme = customizeTheme(theme, { color })

  const mergeProperties = <T extends Block | Inline = Block>(target: Record<T, PropertiesHyphen>, source: Partial<Record<Block | Inline, PropertiesHyphen>>, keys: T[]) => {
    keys.forEach((key) => {
      if (source[key]) {
        target[key] = Object.assign(target[key] || {}, source[key])
      }
    })
  }

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
    `image`,
    `ul`,
    `ol`,
    `block_katex`,
  ]
  const inlineKeys: Inline[] = [`listitem`, `codespan`, `link`, `wx_link`, `strong`, `table`, `thead`, `td`, `footnote`, `figcaption`, `em`, `inline_katex`]

  mergeProperties(newTheme.block, jsonString, blockKeys)
  mergeProperties(newTheme.inline, jsonString, inlineKeys)
  return newTheme
}

export function css2json(css: string): Partial<Record<Block | Inline, PropertiesHyphen>> {
  // 去除所有 CSS 注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, ``)

  const json: Partial<Record<Block | Inline, PropertiesHyphen>> = {}

  // 辅助函数：将声明数组转换为对象
  const toObject = (array: any[]) =>
    array.reduce<{ [k: string]: string }>((obj, item) => {
      const [property, ...value] = item.split(`:`).map((part: string) => part.trim())
      if (property)
        obj[property] = value.join(`:`)
      return obj
    }, {})

  while (css.includes(`{`) && css.includes(`}`)) {
    const lbracket = css.indexOf(`{`)
    const rbracket = css.indexOf(`}`)

    // 获取声明块并转换为对象
    const declarations = css.substring(lbracket + 1, rbracket)
      .split(`;`)
      .map(e => e.trim())
      .filter(Boolean)

    // 获取选择器并去除空格
    const selectors = css.substring(0, lbracket)
      .split(`,`)
      .map(selector => selector.trim()) as (Block | Inline)[]

    const declarationObj = toObject(declarations)

    // 将声明对象关联到相应的选择器
    selectors.forEach((selector) => {
      json[selector] = { ...(json[selector] || {}), ...declarationObj }
    })

    // 处理下一个声明块
    css = css.slice(rbracket + 1).trim()
  }

  return json
}

export function getStyleString(style: ExtendedProperties): string {
  return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join(`; `)
}
