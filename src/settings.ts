export interface MPEasySettings {
    // WeChat Official Account Settings
    wxAppId: string;
    wxSecret: string;
    wxToken: string;

    // Typography Settings
    layoutThemeName: string;
    fontSize: string;
    isUseIndent: boolean;
    primaryColor: string;
    legend: string; // 'alt', 'title', or 'none'

    // Feature Toggles
    isMacCodeBlock: boolean;
    isCiteStatus: boolean;
    isCountStatus: boolean;
    useCustomCSS: boolean;

    // Code Block Settings
    codeThemeName: string;

    // 向后兼容的旧属性名
    themeName?: string;
    codeBlockTheme?: string;
}

export const DEFAULT_SETTINGS: MPEasySettings = {
    wxAppId: '',
    wxSecret: '',
    wxToken: '',
    layoutThemeName: 'default',
    fontSize: '16px',
    isUseIndent: true,
    primaryColor: '#000000',
    legend: 'alt',
    isMacCodeBlock: true,
    isCiteStatus: true,
    isCountStatus: true,
    useCustomCSS: false,
    codeThemeName: 'default',
};