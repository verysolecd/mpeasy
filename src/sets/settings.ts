export interface MPEasySettings {
    // WeChat Official Account Settings
    wxAppId: string;
    wxSecret: string;
    wxToken: string;
    wxTokenTimestamp: number;

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
    customStyleName: string;
    customCss: string;
customCodeBlockCss: string;

    // Security Settings
    encryptionPassword: string;
    defaultBanner: string;

    // WeChat Article Settings
    enableComments: boolean;
    onlyFansCanComment: boolean;
}

export const DEFAULT_SETTINGS: MPEasySettings = {

    wxAppId: '',
    wxSecret: '',
    wxToken: '',
    wxTokenTimestamp: 0,
    layoutThemeName: 'minimal', // Use the new minimal theme as default
    fontSize: '16px',
    isUseIndent: false,
    primaryColor: '#007bff', // A nice default blue
    legend: 'alt',
    isMacCodeBlock: true,
    isCiteStatus: true,
    isCountStatus: true,
    useCustomCSS: false,
    codeThemeName: 'atom-one-dark', // A popular default code theme
    customStyleName: 'none',
    customCss: '',    
    encryptionPassword: '',
    defaultBanner: 'assets/images/banner.png',
    enableComments: true, // 默认允许评论
    onlyFansCanComment: true, // 默认允许所有人评论
    customCodeBlockCss: '',
};