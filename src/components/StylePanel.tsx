import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IOpts } from '../types';
import { getStyles } from '../utils';

// Define theme options and other constants, similar to onlyref
const themeOptions = [
    { label: '默认', value: 'default' },
];

const legendOptions = [
    { label: '图片下方显示 alt', value: 'alt' },
    { label: '图片下方显示 title', value: 'title' },
    { label: '不显示', value: 'none' },
];

interface StylePanelProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<IOpts>) => void;
}

const StylePanel = ({ opts, onOptsChange }: StylePanelProps) => {
    const [codeBlockThemes, setCodeBlockThemes] = useState<{name: string, css: string}[]>([]);

    useEffect(() => {
        const themes = getStyles();
        setCodeBlockThemes(themes);
    }, []);

    const handleValueChange = (key: keyof IOpts, value: any) => {
        onOptsChange({ [key]: value });
    };

    return (
        <div className="style-panel-container">
            <h3 className="style-panel-title">样式与功能</h3>
            <form className="style-panel-form">
                <div className="style-panel-item">
                    <label>排版主题</label>
                    <select
                        value={opts.themeName || 'default'}
                        onChange={(e) => handleValueChange('themeName', e.target.value)}
                    >
                        {themeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="style-panel-item">
                    <label>主颜色</label>
                    <input
                        type="color"
                        value={opts.primaryColor || '#000000'}
                        onChange={(e) => handleValueChange('primaryColor', e.target.value)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>字体大小</label>
                    <input
                        type="text"
                        value={opts.fontSize || '16px'}
                        onChange={(e) => handleValueChange('fontSize', e.target.value)}
                        placeholder="例如: 16px"
                    />
                </div>

                <div className="style-panel-item">
                    <label>代码块主题</label>
                    <select
                        value={opts.codeTheme || 'atom-one-dark'}
                        onChange={(e) => handleValueChange('codeTheme', e.target.value)}
                    >
                        {codeBlockThemes.map(theme => (
                            <option key={theme.name} value={theme.name}>{theme.name}</option>
                        ))}
                    </select>
                </div>

                <div className="style-panel-item">
                    <label>图注显示</label>
                    <select
                        value={opts.legend || 'alt'}
                        onChange={(e) => handleValueChange('legend', e.target.value)}
                    >
                        {legendOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
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
            </form>
        </div>
    );
};

export default StylePanel;
