import type { PropertiesHyphen } from 'csstype';

export type Block = | `container` | `h1` | `h2` | `h3` | `h4` | `h5` | `h6` | `p` | `blockquote` | `blockquote_p` | `blockquote_title` | `code` | `code_pre` | `hr` | `image` | `ol` | `ul` | `block_katex`;
export type Inline = | `listitem` | `codespan` | `link` | `wx_link` | `strong` | `table` | `thead` | `td` | `footnote` | `figcaption` | `em` | `inline_katex`;

// A basic theme structure
export interface Theme {
    name: string;
    base: PropertiesHyphen;
    inline: Record<string, PropertiesHyphen>;
    block: Record<string, PropertiesHyphen>;
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
    codeBlockTheme?: string;
    primaryColor?: string;
    customCSS?: string;
    mermaidPath?: string;
    mathjaxPath?: string;
}

// Flattened theme styles
export interface ThemeStyles {
    [key: string]: PropertiesHyphen;
}

// API returned by the renderer initializer
export interface RendererAPI {
    setOptions(newOpts: Partial<IOpts>): void;
    parseFrontMatterAndContent(content: string): { frontMatter: any; markdownContent: string; };
    parse(markdown: string): string | Promise<string>;
}

// Reading time result
export interface ReadingTimeResults {
    words: number;
    minutes: number;
    text: string;
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