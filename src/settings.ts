export interface MPEasySettings {
    // WeChat Official Account Settings
    wxAppId: string;
    wxSecret: string;
    wxToken: string;

    // Feature Toggles
    useCustomCSS: boolean;
    layoutThemeName: string;
    codeThemeName: string;
}

export const DEFAULT_SETTINGS: MPEasySettings = {
    wxAppId: '',
    wxSecret: '',
    wxToken: '',
    useCustomCSS: false,
    layoutThemeName: 'default',
    codeThemeName: 'default',
}