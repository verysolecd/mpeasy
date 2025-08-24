import * as React from 'react';
import type { MPEasySettings } from '../sets/settings';

interface WeChatArticleSettingsProps {
    settings: MPEasySettings;
    onSettingsChange: (newSettings: Partial<MPEasySettings>) => void;
}

const WeChatArticleSettings = ({ settings, onSettingsChange }: WeChatArticleSettingsProps) => {
    return null; // Render nothing
};

export default WeChatArticleSettings;