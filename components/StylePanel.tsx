import * as React from 'react';
import { themeOptions } from 'd:/Coding/Git_Repos/mpeasy/obsidian-plugin/src/core/theme';
import type { IOpts } from '../types';

interface StylePanelProps {
    opts: IOpts;
    onOptsChange: (newOpts: Partial<IOpts>) => void;
}

const StylePanel = ({ opts, onOptsChange }: StylePanelProps) => {
    return (
        <div className="style-panel-container">
            <h4 className="style-panel-title">样式配置</h4>
            <div className="style-panel-form">
                <div className="style-panel-item">
                    <label htmlFor="theme-select">主题</label>
                    <select 
                        id="theme-select"
                        value={opts.theme.name} 
                        onChange={(e) => onOptsChange({ theme: e.target.value as any })}
                    >
                        {themeOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="style-panel-item">
                    <label htmlFor="font-size-input">字号</label>
                    <input 
                        type="text" 
                        id="font-size-input"
                        value={opts.size}
                        onChange={(e) => onOptsChange({ size: e.target.value })}
                    />
                </div>
                <div className="style-panel-item">
                    <label htmlFor="indent-checkbox">首行缩进</label>
                    <input 
                        type="checkbox" 
                        id="indent-checkbox"
                        checked={opts.isUseIndent}
                        onChange={(e) => onOptsChange({ isUseIndent: e.target.checked })}
                    />
                </div>
            </div>
        </div>
    );
};

export default StylePanel;