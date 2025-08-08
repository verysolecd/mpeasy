export interface MPEasySettings {
    // WeChat Official Account Settings
    wxAppId: string;
    wxSecret: string;
    wxToken: string;

    // Typography Settings
    themeName: string;
    fontSize: string;
    isUseIndent: boolean;
    primaryColor: string;
    legend: string; // 'alt', 'title', or 'none'

    // Feature Toggles
    isMacCodeBlock: boolean;
    isCiteStatus: boolean;
    isCountStatus: boolean;
    useCustomCSS: boolean; // Added this line

    // Code Block Settings
    codeBlockTheme: string;
}

export const DEFAULT_SETTINGS: MPEasySettings = {
    wxAppId: '',
    wxSecret: '',
    wxToken: '',
    themeName: 'default',
    fontSize: '16px',
    isUseIndent: true,
    primaryColor: '#000000',
    legend: 'alt',
    isMacCodeBlock: true,
    isCiteStatus: true,
    isCountStatus: true,
    useCustomCSS: false, // Added this line
    codeTheme: 'atom-one-dark', // A default theme
}