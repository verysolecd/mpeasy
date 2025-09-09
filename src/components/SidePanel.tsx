import * as React from 'react';
import { App } from 'obsidian';
import { useEffect, useState } from 'react';
import { getLayoutThemes, getCodeBlockThemes, getCustomStyles } from '../utils/themeHelpers';
import Combobox from './Combobox';
import { StyleSettings } from '../shared/types/settings';

interface SidePanelProps {
    styleSettings: StyleSettings;
    onOptsChange: (newOpts: Partial<StyleSettings>) => void;
    app: App;
    onRefresh: () => void;
    onCopy: () => Promise<boolean>;
    onSendToDraft: () => Promise<void>;
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
            <button type="button" onClick={onToggle} className="collapsible-section-header">
                {title}
                <span className="collapsible-section-icon"></span>
            </button>
            {!isCollapsed && <div className="collapsible-section-content">{children}</div>}
        </div>
    );
};

const SidePanel = ({ styleSettings, onOptsChange, app, onRefresh, onCopy, onSendToDraft }: SidePanelProps) => {
    const [localSettings, setLocalSettings] = useState(styleSettings);
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    const [customStyles, setCustomStyles] = useState<{ name: string; path: string }[]>([]);
    const [copyButtonText, setCopyButtonText] = useState('复制');
    const [collapsedSections, setCollapsedSections] = useState({
        style: false,
        color: true,
        function: true,
    });

    useEffect(() => {
        setLocalSettings(styleSettings);
    }, [styleSettings]);

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
            getCustomStyles(app).then(styles => setCustomStyles(styles));
        }
    }, [app]);

    const handleValueChange = (key: keyof StyleSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        onOptsChange({ [key]: value });
    };

    const handleCopy = async () => {
        const success = await onCopy();
        setCopyButtonText(success ? '已复制!' : '失败!');
        setTimeout(() => setCopyButtonText('复制'), 2000);
    };

    const toggleSection = (section: keyof typeof collapsedSections) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="side-panel-view-container">
            <h3 className="side-panel-view-title">样式与功能</h3>

            <div className="side-panel-view-actions">
                <button type="button" onClick={onRefresh}>刷新</button>
                <button type="button" onClick={handleCopy}>{copyButtonText}</button>
                <button type="button" onClick={onSendToDraft}>发草稿</button>
            </div>

            <form className="side-panel-view-form">
                <CollapsibleSection
                    title="样式设置"
                    isCollapsed={collapsedSections.style}
                    onToggle={() => toggleSection('style')}
                >
                    <div className="side-panel-view-item">
                        <label>排版主题</label>
                        <select
                            value={localSettings.layoutThemeName || 'minimal'}
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
                            value={localSettings.codeThemeName || 'atom-one-dark'}
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
                            value={localSettings.customStyleName || 'none'}
                            onChange={(e) => handleValueChange('customStyleName', e.target.value)}
                        >
                            {customStyles.map(style => (
                                <option key={style.name} value={style.path}>{style.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="side-panel-view-item">
                        <label>字体大小</label>
                        <Combobox
                            options={['13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px']}
                            value={localSettings.fontSize || '16px'}
                            onChange={(newValue) => handleValueChange('fontSize', newValue)}
                            placeholder="例如: 16px"
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>图注显示</label>
                        <select
                            value={localSettings.legend || 'alt'}
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
                            checked={localSettings.isUseIndent || false}
                            onChange={(e) => handleValueChange('isUseIndent', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>Mac 代码块</label>
                        <input
                            type="checkbox"
                            checked={localSettings.isMacCodeBlock || false}
                            onChange={(e) => handleValueChange('isMacCodeBlock', e.target.checked)}
                        />
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
                                    className={`color-preset-item ${localSettings.primaryColor === preset.color ? 'selected' : ''}`}
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
                                value={localSettings.primaryColor || '#007bff'}
                                onChange={(e) => handleValueChange('primaryColor', e.target.value)}
                                className="custom-color-picker"
                            />
                            <input
                                type="text"
                                value={localSettings.primaryColor || '#007bff'}
                                onChange={(e) => handleValueChange('primaryColor', e.target.value)}
                                className="custom-color-input"
                            />
                        </div>
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
                            checked={localSettings.isCiteStatus || false}
                            onChange={(e) => handleValueChange('isCiteStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>字数统计</label>
                        <input
                            type="checkbox"
                            checked={localSettings.isCountStatus || false}
                            onChange={(e) => handleValueChange('isCountStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>启用自定义 CSS</label>
                        <input
                            type="checkbox"
                            checked={localSettings.useCustomCSS || false}
                            onChange={(e) => handleValueChange('useCustomCSS', e.target.checked)}
                        />
                    </div>
                </CollapsibleSection>
            </form>
        </div>
    );
};

export default SidePanel;
