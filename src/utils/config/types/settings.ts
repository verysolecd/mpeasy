export interface StyleSettings {
    layoutThemeName: string;
    codeThemeName: string;
    customStyleName: string;
    fontSize: string;
    legend: string;
    isUseIndent: boolean;
    isMacCodeBlock: boolean;
    primaryColor: string;
    isCiteStatus: boolean;
    isCountStatus: boolean;
    useCustomCSS: boolean;
    isUseJustify: boolean;
}

export interface MPEasySettings {
    styleSettings: StyleSettings;
    wxId: string;
    wxSecret: string;
    wxToken: string;
    wxTokenAcquisitionTime: number;
    defaultCoverBanner: string;
    isCommentDisabled: boolean;
    isFansOnlyComment: boolean;
    enableFrontmatterInjection: boolean;
    epigraph: string;
}
