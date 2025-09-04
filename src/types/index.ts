
export interface MPEasySettings {
    mySetting: string;
    // Future settings will go here
}

export const DEFAULT_SETTINGS: MPEasySettings = {
    mySetting: 'default',
};

export interface RenderOptions {
    theme: string;
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    paragraphSpacing: number;
    // Add more style options here as needed
}

