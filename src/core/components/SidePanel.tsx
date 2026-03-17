import * as React from 'react';
import { App } from 'obsidian';
import { useEffect, useState } from 'react';
import { getLayoutThemes, getCodeBlockThemes, getCustomStyles } from '../../rendering/themeHelpers';
import Combobox from './Combobox';
import { MPEasySettings, StyleSettings } from '../../utils/config/types/settings';
import { PRESET_COLORS, DEFAULT_CONFIG } from '../../utils/config/constants';
import { Copy, Image, RefreshCw, Send } from 'lucide-react';

interface SidePanelProps {
    settings: MPEasySettings;
    onSettingsChange: (newOpts: Partial<MPEasySettings>) => void;
    app: App;
    onRefresh: () => void;
    onCopyHTML: (processImages: boolean) => Promise<boolean>;
    onSendToDraft: () => Promise<void>;
}



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

const SidePanel = ({ settings, onSettingsChange, app, onRefresh, onCopyHTML, onSendToDraft }: SidePanelProps) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [layoutThemes, setLayoutThemes] = useState<{ name: string; path: string }[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{ name: string; path: string }[]>([]);
    const [customStyles, setCustomStyles] = useState<{ name: string; path: string }[]>([]);
    const [copyButtonText, setCopyButtonText] = useState('复制(无图)');
    const [copyWithImageButtonText, setCopyWithImageButtonText] = useState('复制(带图)');
    const [collapsedSections, setCollapsedSections] = useState({
        style: false,
        color: true,
        function: false,
    });

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
        if (app) {
            getLayoutThemes(app).then(themes => setLayoutThemes(themes));
            getCodeBlockThemes(app).then(themes => setCodeBlockThemes(themes));
            getCustomStyles(app).then(styles => setCustomStyles(styles));
        }
    }, [app]);

    const handleSettingChange = (key: keyof MPEasySettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        onSettingsChange({ [key]: value });
    };

    const handleStyleChange = (key: keyof StyleSettings, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            styleSettings: {
                ...prev.styleSettings,
                [key]: value,
            }
        }));
        onSettingsChange({
            styleSettings: { [key]: value } as any
        });
    };

    const handleCopy = async (processImages: boolean) => {
        const success = await onCopyHTML(processImages);
        if (processImages) {
            setCopyWithImageButtonText(success ? '已复制!' : '失败!');
            setTimeout(() => setCopyWithImageButtonText('复制(带图)'), 2000);
        } else {
            setCopyButtonText(success ? '已复制!' : '失败!');
            setTimeout(() => setCopyButtonText('复制(无图)'), 2000);
        }
    };

    const toggleSection = (section: keyof typeof collapsedSections) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="side-panel-view-container">
            <h3 className="side-panel-view-title">样式与功能</h3>

            <div className="side-panel-view-actions">
                <button type="button" onClick={onRefresh}>
                    <div className="button-content">
                        <RefreshCw size={24} />
                        <span className="button-tooltip">刷新</span>
                    </div>
                </button>
                <button type="button" onClick={() => handleCopy(false)}>
                    <div className="button-content">
                        <Copy size={24} />
                        <span className="button-tooltip">{copyButtonText}</span>
                    </div>
                </button>
                <button type="button" onClick={() => handleCopy(true)}>
                    <div className="button-content">
                        <Image size={24} />
                        <span className="button-tooltip">{copyWithImageButtonText}</span>
                    </div>
                </button>
                <button type="button" onClick={onSendToDraft}>
                    <div className="button-content">
                        <Send size={24} />
                        <span className="button-tooltip">发草稿</span>
                    </div>
                </button>
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
                            value={localSettings.styleSettings.layoutThemeName || DEFAULT_CONFIG.DEFAULT_LAYOUT_THEME}
                            onChange={(e) => handleStyleChange('layoutThemeName', e.target.value)}
                        >
                            {layoutThemes.map(theme => (
                                <option key={theme.name} value={theme.path}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="side-panel-view-item">
                        <label>代码块主题</label>
                        <select
                            value={localSettings.styleSettings.codeThemeName || DEFAULT_CONFIG.DEFAULT_CODE_THEME}
                            onChange={(e) => handleStyleChange('codeThemeName', e.target.value)}
                        >
                            {codeBlockThemes.map(theme => (
                                <option key={theme.name} value={theme.path}>{theme.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="side-panel-view-item">
                        <label>自定义样式</label>
                        <select
                            value={localSettings.styleSettings.customStyleName || 'none'}
                            onChange={(e) => handleStyleChange('customStyleName', e.target.value)}
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
                            value={localSettings.styleSettings.fontSize || DEFAULT_CONFIG.DEFAULT_FONT_SIZE}
                            onChange={(newValue) => handleStyleChange('fontSize', newValue)}
                            placeholder="例如: 16px"
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>图注显示</label>
                        <select
                            value={localSettings.styleSettings.legend || 'alt'}
                            onChange={(e) => handleStyleChange('legend', e.target.value)}
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
                            checked={localSettings.styleSettings.isUseIndent || false}
                            onChange={(e) => handleStyleChange('isUseIndent', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>Mac 代码块</label>
                        <input
                            type="checkbox"
                            checked={localSettings.styleSettings.isMacCodeBlock || false}
                            onChange={(e) => handleStyleChange('isMacCodeBlock', e.target.checked)}
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
                                    className={`color-preset-item ${localSettings.styleSettings.primaryColor === preset.color ? 'selected' : ''}`}
                                    onClick={() => handleStyleChange('primaryColor', preset.color)}
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
                                value={localSettings.styleSettings.primaryColor || DEFAULT_CONFIG.DEFAULT_PRIMARY_COLOR}
                                onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
                                className="custom-color-picker"
                            />
                            <input
                                type="text"
                                value={localSettings.styleSettings.primaryColor || '#007bff'}
                                onChange={(e) => handleStyleChange('primaryColor', e.target.value)}
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
                            checked={localSettings.styleSettings.isCiteStatus || false}
                            onChange={(e) => handleStyleChange('isCiteStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>字数统计</label>
                        <input
                            type="checkbox"
                            checked={localSettings.styleSettings.isCountStatus || false}
                            onChange={(e) => handleStyleChange('isCountStatus', e.target.checked)}
                        />
                    </div>

                    <div className="side-panel-view-item">
                        <label>启用自定义 CSS</label>
                        <input
                            type="checkbox"
                            checked={localSettings.styleSettings.useCustomCSS || false}
                            onChange={(e) => handleStyleChange('useCustomCSS', e.target.checked)}
                        />
                    </div>
                    <div className="side-panel-view-item">
                        <label>注入文章头尾模板</label>
                        <input
                            type="checkbox"
                            checked={localSettings.enableFrontmatterInjection || false}
                            onChange={(e) => handleSettingChange('enableFrontmatterInjection', e.target.checked)}
                        />
                    </div>
                </CollapsibleSection>
            </form>
        </div>
    );
};

export default SidePanel;