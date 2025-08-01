import type { PropertiesHyphen } from 'csstype';

// A basic theme structure
export interface Theme {
    base: PropertiesHyphen;
    inline: Record<string, PropertiesHyphen>;
    block: Record<string, PropertiesHyphen>;
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
}

// Flattened theme styles
export interface ThemeStyles {
    [key: string]: PropertiesHyphen;
}

// API returned by the renderer initializer
export interface RendererAPI {
    buildAddition(): string;
    buildFootnotes(): string;
    setOptions(newOpts: Partial<IOpts>): void;
    reset(newOpts: Partial<IOpts>): void;
    parseFrontMatterAndContent(markdownText: string): { yamlData: any; markdownContent: string; readingTime: any };
    buildReadingTime(readingTime: any): string;
    createContainer(content: string): string;
    getOpts(): IOpts;
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
