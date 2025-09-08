import * as React from 'react';
import { useEffect, useState } from 'react';
import type { MPEasySettings } from '../shared/types';
import { getLayoutThemes, getCodeBlockThemes, getCustomStyles } from '../utils/themeHelpers';
import Combobox from './Combobox';
import type MPEasyPlugin from '../main';

interface SidePanelProps {
    plugin: MPEasyPlugin;
    onOptsChange: (newOpts: Partial<MPEasySettings>) => void;
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

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    isCollapsed: boolean;
    onToggle: () => void;
}

const CollapsibleSection = ({ title, children, isCollapsed, onToggle }: CollapsibleSectionProps) => {
    return (
        <div className={`collapsible-section ${isCollapsed ? 'collapsed' : ''}`}>
            <button onClick={onToggle} className="collapsible-section-header">
                {title}
                <span className="collapsible-section-icon"></span>
            </button>
            {!isCollapsed && <div className="collapsible-section-content">{children}</div>}
        </div>
    );
};


const SidePanel = ({ plugin, onOptsChange }: SidePanelProps) => {
    const { settings, app } = plugin;
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    const [customStyles, setCustomStyles] = useState<{ name: string; path: string }[]>([]);
    const [customColor, setCustomColor] = useState(settings.primaryColor || '#007bff');
    const [collapsedSections, setCollapsedSections] = useState({
        theme: false,
        color: true,
        typography: true,
        function: true,
    });

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
            getCustomStyles(app).then(styles => setCustomStyles(styles));
        }
        setCustomColor(settings.primaryColor || '#007bff');
    }, [settings.primaryColor, app]);

    const handleValueChange = (key: keyof MPEasySettings, value: any) => {
        onOptsChange({ [key]: value });
    };

    const handleCustomColorApply = () => {
        handleValueChange('primaryColor', customColor);
    };

    const toggleSection = (section: keyof typeof collapsedSections) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="side-panel-view-container">
            <h3 className="side-panel-view-title">样式与功能</h3>
            <form className="side-panel-view-form">
                <CollapsibleSection
                    title="主题设置"
                    isCollapsed={collapsedSections.theme}
                    onToggle={() => toggleSection('theme')}
                >
                    <div className="side-panel-view-item">
                        <label>排版主题</label>
                        <select
                            value={settings.layoutThemeName || 'minimal'}
                            onChange={(e) => handleValueChange('layoutThemeName', e.target.value)}
                        >
                            {layoutThemes.map(theme => (
                                <option key={theme.name} value={theme.path}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="side-panel-view-item">
                        <label>代码块主题</label>
                        <select
                            value={settings.codeThemeName || 'atom-one-dark'}
                            onChange={(e) => handleValueChange('codeThemeName', e.target.value)}
                        >
                            {codeBlockThemes.map(theme => (
                                <option key={theme.name} value={theme.path}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="side-panel-view-item">
                        <label>自定义样式</label>
                        <select
                            value={settings.customStyleName || 'none'}
                            onChange={(e) => handleValueChange('customStyleName', e.target.value)}
                        >
                            {customStyles.map(style => (
                                <option key={style.name} value={style.path}>{style.name}</option>
                            ))}
                        </select>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="颜色设置"
                    isCollapsed={collapsedSections.color}
                    onToggle={() => toggleSection('color')}
                >
                    <div className="side-panel-view-item-column">
                        <label>主题色</label>
                        <div className="color-preset-grid">
                            {PRESET_COLORS.map(preset => (
                                <div
                                    key={preset.name}
                                    className={`color-preset-item ${settings.primaryColor === preset.color ? 'selected' : ''}`}
                                    onClick={() => handleValueChange('primaryColor', preset.color)}
                                >
                                    <div className="color-swatch" style={{ backgroundColor: preset.color }}></div>
                                    <span>{preset.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="side-panel-view-item-column">
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
                </CollapsibleSection>

                <CollapsibleSection
                    title="排版设置"
                    isCollapsed={collapsedSections.typography}
                    onToggle={() => toggleSection('typography')}
                >
                    <div className="side-panel-view-item">
                        <label>字体大小</label>
                        <Combobox
                            options={['13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px']}
                            value={settings.fontSize || '16px'}
                            onChange={(newValue) => handleValueChange('fontSize', newValue)}
                            placeholder="例如: 16px"
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>图注显示</label>
                        <select
                            value={settings.legend || 'alt'}
                            onChange={(e) => handleValueChange('legend', e.target.value)}
                        >
                            <option value="alt">图片下方显示 alt</option>
                            <option value="title">图片下方显示 title</option>
                            <option value="none">不显示</option>
                        </select>
                    </div>

                    <div className="side-panel-view-item">
                        <label>首行缩进</label>
                        <input
                            type="checkbox"
                            checked={settings.isUseIndent || false}
                            onChange={(e) => handleValueChange('isUseIndent', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>Mac 代码块</label>
                        <input
                            type="checkbox"
                            checked={settings.isMacCodeBlock || false}
                            onChange={(e) => handleValueChange('isMacCodeBlock', e.target.checked)}
                        />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="功能开关"
                    isCollapsed={collapsedSections.function}
                    onToggle={() => toggleSection('function')}
                >
                    <div className="side-panel-view-item">
                        <label>文末引用</label>
                        <input
                            type="checkbox"
                            checked={settings.isCiteStatus || false}
                            onChange={(e) => handleValueChange('isCiteStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>字数统计</label>
                        <input
                            type="checkbox"
                            checked={settings.isCountStatus || false}
                            onChange={(e) => handleValueChange('isCountStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>启用自定义 CSS</label>
                        <input
                            type="checkbox"
                            checked={settings.useCustomCSS || false}
                            onChange={(e) => handleValueChange('useCustomCSS', e.target.checked)}
                        />
                    </div>
                </CollapsibleSection>
            </form>
        </div>
    );
};

export default SidePanel;
