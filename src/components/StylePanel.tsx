import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IOpts, MPEasySettings } from '../types';
import { getLayoutThemes, getCodeBlockThemes } from '../utils';
import Combobox from './Combobox';
import { App } from 'obsidian';


interface StylePanelProps {
    settings: MPEasySettings;
    onSettingsChange: (newSettings: Partial<MPEasySettings>) => void;
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

const StylePanel = ({ settings, onSettingsChange, app }: StylePanelProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isWeChatSettingsCollapsed, setIsWeChatSettingsCollapsed] = useState(false); // Added this line
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
            
        }
    }, [app]);

    const handleValueChange = (key: keyof MPEasySettings, value: any) => {
        onOptsChange({ [key]: value });
    };

    const handleCustomColorApply = () => {
        handleValueChange('primaryColor', customColor);
    };

    return (
        <div className="style-panel-container mpeasy-style-panel-container">

<div className="wechat-article-settings-container">
                    <div className="wechat-article-settings-header" onClick={() => setIsWeChatSettingsCollapsed(!isWeChatSettingsCollapsed)}>
                        <h3 className="wechat-article-settings-title">
                            公众号文章设置
                        </h3>
                        <div className="wechat-article-settings-toggle" style={{
                            transform: isWeChatSettingsCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        }}>
                            <span className="wechat-article-settings-toggle-icon">∨</span>
                        </div>
                    </div>
                    {!isWeChatSettingsCollapsed && (
                        <form className="style-panel-form">
                        <div className="style-panel-item">
                            <label>开启评论</label>
                            <input
                                type="checkbox"
                                checked={settings.enableComments}
                                onChange={(e) => onSettingsChange({ enableComments: e.target.checked })}
                            />
                        </div>

                        <div className="style-panel-item">
                            <label>仅粉丝可评论</label>
                            <input
                                type="checkbox"
                                checked={settings.onlyFansCanComment}
                                onChange={(e) => onSettingsChange({ onlyFansCanComment: e.target.checked })}
                            />
                        </div>
                    </form>
                    )}
                </div>












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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            style={{
                                padding: '4px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: settings.layoutThemeName === 'ref-classic' ? '#cce7ff' : '#fff'
                            }}
                            onClick={() => onSettingsChange({ layoutThemeName: 'ref-classic' })}
                        >
                            经典
                        </button>
                        <button
                            type="button"
                            style={{
                                padding: '4px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: settings.layoutThemeName === 'ref-elegant' ? '#cce7ff' : '#fff'
                            }}
                            onClick={() => onSettingsChange({ layoutThemeName: 'ref-elegant' })}
                        >
                            优雅
                        </button>
                        <button
                            type="button"
                            style={{
                                padding: '4px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: settings.layoutThemeName === 'ref-simple' ? '#cce7ff' : '#fff'
                            }}
                            onClick={() => onSettingsChange({ layoutThemeName: 'ref-simple' })}
                        >
                            简洁
                        </button>
                    </div>
                </div>

                <div className="style-panel-item">
                    <label>代码块主题</label>
                    <select
                        value={settings.codeThemeName || 'atom-one-dark'}
                        onChange={(e) => onSettingsChange({ codeThemeName: e.target.value })}
                    >
                        {codeBlockThemes.map(theme => (
                            <option key={theme.name} value={theme.path}>{theme.name}</option>
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
                                value={settings.primaryColor}
                                onChange={(e) => onSettingsChange({ primaryColor: e.target.value })}
                                className="mpeasy-color-picker-input"
                            />
                            <input
                                type="text"
                                value={settings.primaryColor}
                                onChange={(e) => onSettingsChange({ primaryColor: e.target.value })}
                                className="mpeasy-color-text-input"
                            />
                        </div>
                        
                        <div style={{
                            borderTop: '1px solid #cce7ff',
                            paddingTop: '12px'
                        }}>
                            <div className="color-preset-grid">
                                {PRESET_COLORS.map(preset => (
                                    <div
                                        key={preset.name}
                                        className={`color-preset-item mpeasy-color-preset-item ${settings.primaryColor === preset.color ? 'selected' : ''}`}
                                        onClick={() => onSettingsChange({ primaryColor: preset.color })}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '6px 8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: settings.primaryColor === preset.color ? '#cce7ff' : 'transparent'
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
                        value={settings.fontSize || '16px'}
                        onChange={(newValue) => onSettingsChange({ fontSize: newValue })}
                        placeholder="例如: 16px"
                    />
                </div>

                <div className="style-panel-item">
                    <label>图注显示</label>
                    <select
                        value={settings.legend || 'alt'}
                        onChange={(e) => onSettingsChange({ legend: e.target.value })}
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
                        checked={settings.isUseIndent || false}
                        onChange={(e) => {
                            onSettingsChange({ isUseIndent: e.target.checked });
                            console.log('StylePanel: isUseIndent changed to', e.target.checked);
                        }}
                    />
                </div>

                <div className="style-panel-item">
                    <label>Mac 代码块</label>
                    <input
                        type="checkbox"
                        checked={settings.isMacCodeBlock || false}
                        onChange={(e) => onSettingsChange({ isMacCodeBlock: e.target.checked })}
                    />
                </div>

                <div className="style-panel-item">
                    <label>文末引用</label>
                    <input
                        type="checkbox"
                        checked={settings.isCiteStatus || false}
                        onChange={(e) => onSettingsChange({ isCiteStatus: e.target.checked })}
                    />
                </div>

                <div className="style-panel-item">
                    <label>字数统计</label>
                    <input
                        type="checkbox"
                        checked={settings.isCountStatus || false}
                        onChange={(e) => onSettingsChange({ isCountStatus: e.target.checked })}
                    />
                </div>

                <div className="style-panel-item">
                    <label>启用自定义 CSS</label>
                    <input
                        type="checkbox"
                        checked={settings.useCustomCSS || false}
                        onChange={(e) => onSettingsChange({ useCustomCSS: e.target.checked })}
                    />
                </div>                
            </form>
            )}
        </div>
    );
};

export default StylePanel;