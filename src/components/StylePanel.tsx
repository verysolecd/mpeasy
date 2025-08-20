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
        <div className="style-panel-container" style={{ marginBottom: '16px', padding: '0', width: '100%' }}>
            <div className="style-panel-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                userSelect: 'none',
                width: '100%',
                boxSizing: 'border-box'
            }} onClick={() => setIsCollapsed(!isCollapsed)}>
                <h3 className="style-panel-title" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    样式与功能
                </h3>
                <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>∨</span>
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
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'linear-gradient(45deg, #e6f3ff 25%, transparent 25%, transparent 50%, #e6f3ff 50%, #e6f3ff 75%, transparent 75%, transparent)',
                            backgroundSize: '20px 20px',
                            backgroundColor: '#f0f8ff',
                            border: '1px solid #cce7ff',
                            borderRadius: '12px 12px 0 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#007bff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                        onClick={(e) => {
                            const colorBox = e.currentTarget.nextElementSibling;
                            if (colorBox) {
                                colorBox.style.display = colorBox.style.display === 'none' ? 'block' : 'none';
                                e.currentTarget.style.borderRadius = colorBox.style.display === 'none' ? '12px' : '12px 12px 0 0';
                            }
                        }}
                    >
                        <span>自定义主题色</span>
                        <span style={{ fontSize: '12px' }}>▼</span>
                    </button>
                    <div style={{
                        width: '100%',
                        backgroundColor: '#e6f3ff',
                        borderRadius: '0 0 12px 12px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0, 123, 255, 0.15)',
                        border: '1px solid #cce7ff',
                        borderTop: 'none',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    marginRight: '8px',
                                    cursor: 'pointer'
                                }}
                            />
                            <input
                                type="text"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                style={{
                                    width: '80px',
                                    padding: '6px 10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    marginRight: '8px'
                                }}
                            />
                            <button 
                                type="button" 
                                onClick={handleCustomColorApply} 
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap'
                                }}
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
                                        className={`color-preset-item ${opts.primaryColor === preset.color ? 'selected' : ''}`}
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
                                            className="color-swatch" 
                                            style={{ 
                                                backgroundColor: preset.color,
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                marginRight: '8px',
                                                border: '1px solid #ddd'
                                            }}
                                        ></div>
                                        <span style={{ fontSize: '13px', color: '#333' }}>{preset.name}</span>
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