import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IOpts, MPEasySettings } from '../types';
import { getLayoutThemes, getCodeBlockThemes, getCustomStyles } from '../utils';
import Combobox from './Combobox';
import { App } from 'obsidian';
import CssEditor from './CssEditor';

interface StylePanelProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<MPEasySettings>) => void;
    app: App;
    customCss: string;
    setCustomCss: (css: string) => void;
    customCodeBlockCss: string;
    setCustomCodeBlockCss: (css: string) => void;
    onSaveCustomCss: () => void;
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

const StylePanel = ({ opts, onOptsChange, app, customCss, setCustomCss, customCodeBlockCss, setCustomCodeBlockCss, onSaveCustomCss }: StylePanelProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    const [customStyles, setCustomStyles] = useState<{ name: string; path: string }[]>([]);
    const [customColor, setCustomColor] = useState(opts.primaryColor || '#007bff');

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
            getCustomStyles(app).then(styles => setCustomStyles(styles));
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
        <div className="style-panel-container mpeasy-style-panel-container">
            <div className="style-panel-header mpeasy-style-panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h3 className="style-panel-title mpeasy-style-panel-title">
                    样式与功能
                </h3>
                <div className="mpeasy-style-panel-header-toggle" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    <span className="mpeasy-style-panel-header-toggle-icon">∨</span>
                </div>
            </div>
            {!isCollapsed && (
                <form className="style-panel-form" style={{ padding: '0 8px' }}>
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

                <div className="style-panel-item">
                    <label>自定义样式</label>
                    <select
                        value={opts.customStyleName || 'none'}
                        onChange={(e) => handleValueChange('customStyleName', e.target.value)}
                    >
                        {customStyles.map(style => (
                            <option key={style.name} value={style.path}>{style.name}</option>
                        ))}
                    </select>
                </div>

                <div className="style-panel-item-column" style={{ margin: '0 5px' }}>
                    <button
    type="button"
    className="mpeasy-custom-color-button"
    onClick={(e) => {
        const colorBox = e.currentTarget.nextElementSibling;
        if (colorBox) {
            colorBox.style.display = colorBox.style.display === 'none' ? 'block' : 'none';
            e.currentTarget.style.borderRadius = colorBox.style.display === 'none' ? '12px' : '12px 12px 0 0';
        }
    }}
>
    <span>自定义主题色</span>
    <span className="mpeasy-custom-color-button-icon">▼</span>
</button>
                    <div className="mpeasy-custom-color-panel">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                className="mpeasy-color-picker-input"
                            />
                            <input
                                type="text"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                className="mpeasy-color-text-input"
                            />
                            <button 
                                type="button" 
                                onClick={handleCustomColorApply} 
                                className="mpeasy-color-apply-button"
                            >
                                确定
                            </button>
                        </div>
                        
                        <div style={{
                            borderTop: '1px solid #cce7ff',
                            paddingTop: '12px'
                        }}>
                            <div className="color-preset-grid">
                                {PRESET_COLORS.map(preset => (
                                    <div
                                        key={preset.name}
                                        className={`color-preset-item mpeasy-color-preset-item ${opts.primaryColor === preset.color ? 'selected' : ''}`}
                                        onClick={() => handleValueChange('primaryColor', preset.color)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '6px 8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: opts.primaryColor === preset.color ? '#cce7ff' : 'transparent'
                                        }}
                                    >
                                        <div 
                                            className="color-swatch mpeasy-color-swatch" 
                                            style={{ 
                                                backgroundColor: preset.color,
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                marginRight: '8px',
                                                border: '1px solid #ddd'
                                            }}
                                        ></div>
                                        <span className="mpeasy-color-preset-name">{preset.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
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

                <div className="style-panel-item-column">
                    <label>自定义CSS</label>
                    <CssEditor value={customCss} onChange={setCustomCss} />
                    <button type="button" onClick={onSaveCustomCss}>保存自定义CSS</button>
                </div>

                
            </form>
            )}
        </div>
    );
};

export default StylePanel;