import * as React from 'react';
import { useState, useEffect } from 'react';
import MPEasyPlugin from '../main';

interface Props {
    plugin: MPEasyPlugin;
}

const Settings: React.FC<Props> = ({ plugin }) => {
    const [mySetting, setMySetting] = useState(plugin.settings.mySetting);

    useEffect(() => {
        setMySetting(plugin.settings.mySetting);
    }, [plugin.settings.mySetting]);

    const handleSettingChange = async (value: string) => {
        setMySetting(value);
        plugin.settings.mySetting = value;
        await plugin.saveSettings();
    };

    return (
        <div className="mpeasy-settings-container">
            <h1>MPEasy Settings</h1>
            <div className="setting-item">
                <label htmlFor="my-setting-input">My Setting</label>
                <input
                    id="my-setting-input"
                    type="text"
                    value={mySetting}
                    onChange={(e) => handleSettingChange(e.target.value)}
                />
                <p className="setting-description">This is an example setting, demonstrating how React components can interact with Obsidian plugin settings.</p>
            </div>
        </div>
    );
};

export default Settings;
