export interface MPEasySettings {
    wxAppId: string;
    wxSecret: string;
    wxToken: string;
    themeName: string;
    isUseIndent: boolean;
    fontSize: string;
}

export const DEFAULT_SETTINGS: MPEasySettings = {
    wxAppId: '',
    wxSecret: '',
    wxToken: '',
    themeName: 'default',
    isUseIndent: true,
    fontSize: '16px',
}