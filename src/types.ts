import type { PropertiesHyphen } from 'csstype';
import type { ReadTimeResults } from 'reading-time';
import type { MPEasySettings } from './settings';


type GFMBlock = `blockquote_note` | `blockquote_tip` | `blockquote_info` | `blockquote_important` | `blockquote_warning` | `blockquote_caution`
  | `blockquote_title` | `blockquote_title_note` | `blockquote_title_tip` | `blockquote_title_info` | `blockquote_title_important` | `blockquote_title_warning` | `blockquote_title_caution`
  | `blockquote_p` | `blockquote_p_note` | `blockquote_p_tip` | `blockquote_p_info` | `blockquote_p_important` | `blockquote_p_warning` | `blockquote_p_caution`

export type Block = `container` | `h1` | `h2` | `h3` | `h4` | `h5` | `h6` | `p` | `blockquote` | `blockquote_p` | `code_pre` | `code` | `image` | `ol` | `ul` | `footnotes` | `figure` | `hr` | `block_katex` | GFMBlock;
export type Inline = `listitem` | `codespan` | `link` | `wx_link` | `strong` | `table` | `thead` | `th` | `td` | `footnote` | `figcaption` | `em` | `inline_katex`;

interface CustomCSSProperties {
  [`--md-primary-color`]?: string
  [key: `--${string}`]: string | undefined
}

export type ExtendedProperties = PropertiesHyphen & CustomCSSProperties

// A basic theme structure
export interface Theme {
    name: string;
    base: ExtendedProperties;
    inline: Record<string, ExtendedProperties>;
    block: Record<string, ExtendedProperties>;
    styles: ThemeStyles;
}

// Options for the renderer
export interface IOpts {
    theme: Theme;
    fonts: string;
    size: string;
    isUseIndent: boolean;
    legend?: string;
    citeStatus?: boolean;
    countStatus?: boolean;
    isMacCodeBlock?: boolean;
    codeThemeName?: string;
    layoutThemeName?: string;
    customStyleName?: string;
    primaryColor?: string;
    customCSS?: string;
    mermaidPath?: string;
    mathjaxPath?: string;
    obsidianTheme?: 'light' | 'dark';
}

// Flattened theme styles
export type ThemeStyles = Record<Block | Inline, ExtendedProperties>


// API returned by the renderer initializer
export interface RendererAPI {
    setOptions(newSettings: Partial<MPEasySettings>): void;
    parseFrontMatterAndContent(content: string): { frontMatter: any; markdownContent: string; };
    parse(markdown: string): string | Promise<string>;
    reset: (newSettings: Partial<MPEasySettings>) => void;
    getSettings: () => MPEasySettings;
    buildReadingTime: (reading: ReadTimeResults) => string;
    buildFootnotes: () => string;
    buildAddition: () => string;
    createContainer: (html: string) => string;
    getStyles(): string;
}

// Alert extension options
export interface AlertOptions {
    className?: string;
    variants?: AlertVariantItem[];
    withoutStyle?: boolean;
    styles?: ThemeStyles;
}

export interface AlertVariantItem {
    type: string;
    icon: string;
    title?: string;
}

export interface HeadingItem {
    text: string;
    depth: number;
    slug: string;
}
