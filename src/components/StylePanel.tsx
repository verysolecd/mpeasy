import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IOpts, MPEasySettings } from '../types';
import { getLayoutThemes, getCodeBlockThemes } from '../utils';
import Combobox from './Combobox';
import { App } from 'obsidian';

interface StylePanelProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<MPEasySettings>) => void;
    app: App;
}

const PRESET_COLORS = [
    { name: '经典蓝', color: '#0F4C81' },
    { name: '翡翠绿', color: '#009874' },
    { name: '活力橘', color: '#FA5151' },
    { name: '柠檬黄', color: '#FECE00' },
    { name: '薰衣紫', color: '#92617E' },
    { name: '天空蓝', color: '#55C9EA' },
    { name: '玫瑰金', color: '#B76E79' },
    { name: '橄榄绿', color: '#556B2F' },
    { name: '石墨黑', color: '#333333' },
    { name: '雾烟灰', color: '#A9A9A9' },
    { name: '樱花粉', color: '#FFB7C5' },
];

const StylePanel = ({ opts, onOptsChange, app }: StylePanelProps) => {
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    const [customColor, setCustomColor] = useState(opts.primaryColor || '#007bff');

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
        }
        setCustomColor(opts.primaryColor || '#007bff');
    }, [opts.primaryColor, app]);

    const handleValueChange = (key: keyof MPEasySettings, value: any) => {
        onOptsChange({ [key]: value });
    };

    const handleCustomColorApply = () => {
        handleValueChange('primaryColor', customColor);
    };

    return (
        <div className="style-panel-container">
            <h3 className="style-panel-title">样式与功能</h3>
            <form className="style-panel-form">
                <div className="style-panel-item">
                    <label>排版主题</label>
                    <select
                        value={opts.layoutThemeName || 'minimal'}
                        onChange={(e) => handleValueChange('layoutThemeName', e.target.value)}
                    >
                        {layoutThemes.map(theme => (
                            <option key={theme.name} value={theme.path}>{theme.name}</option>
                        ))}
                    </select>
                </div>

                <div className="style-panel-item">
                    <label>代码块主题</label>
                    <select
                        value={opts.codeThemeName || 'atom-one-dark'}
                        onChange={(e) => handleValueChange('codeThemeName', e.target.value)}
                    >
                        {codeBlockThemes.map(theme => (
                            <option key={theme.name} value={theme.path}>{theme.name}</option>
                        ))}
                    </select>
                </div>

                <div className="style-panel-item-column">
                    <label>主题色</label>
                    <div className="color-preset-grid">
                        {PRESET_COLORS.map(preset => (
                            <div
                                key={preset.name}
                                className={`color-preset-item ${opts.primaryColor === preset.color ? 'selected' : ''}`}
                                onClick={() => handleValueChange('primaryColor', preset.color)}
                            >
                                <div className="color-swatch" style={{ backgroundColor: preset.color }}></div>
                                <span>{preset.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="style-panel-item-column">
                    <label>自定义主题色</label>
                    <div className="custom-color-container">
                        <input
                            type="color"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                            className="custom-color-picker"
                        />
                        <input
                            type="text"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                            className="custom-color-input"
                        />
                        <button type="button" onClick={handleCustomColorApply} className="custom-color-apply-btn">确定</button>
                    </div>
                </div>

                <div className="style-panel-item">
                    <label>字体大小</label>
                    <Combobox
                        options={['13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px']}
                        value={opts.fontSize || '16px'}
                        onChange={(newValue) => handleValueChange('fontSize', newValue)}
                        placeholder="例如: 16px"
                    />
                </div>

                <div className="style-panel-item">
                    <label>图注显示</label>
                    <select
                        value={opts.legend || 'alt'}
                        onChange={(e) => handleValueChange('legend', e.target.value)}
                    >
                        <option value="alt">图片下方显示 alt</option>
                        <option value="title">图片下方显示 title</option>
                        <option value="none">不显示</option>
                    </select>
                </div>

                <div className="style-panel-item">
                    <label>首行缩进</label>
                    <input
                        type="checkbox"
                        checked={opts.isUseIndent || false}
                        onChange={(e) => handleValueChange('isUseIndent', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>Mac 代码块</label>
                    <input
                        type="checkbox"
                        checked={opts.isMacCodeBlock || false}
                        onChange={(e) => handleValueChange('isMacCodeBlock', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>文末引用</label>
                    <input
                        type="checkbox"
                        checked={opts.isCiteStatus || false}
                        onChange={(e) => handleValueChange('isCiteStatus', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>字数统计</label>
                    <input
                        type="checkbox"
                        checked={opts.isCountStatus || false}
                        onChange={(e) => handleValueChange('isCountStatus', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>启用自定义 CSS</label>
                    <input
                        type="checkbox"
                        checked={opts.useCustomCSS || false}
                        onChange={(e) => handleValueChange('useCustomCSS', e.target.checked)}
                    />
                </div>
            </form>
        </div>
    );
};

export default StylePanel;