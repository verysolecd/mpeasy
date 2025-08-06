import * as React from 'react';
import type { IOpts } from '../src/types';

// Define theme options and other constants, similar to onlyref
const themeOptions = [
    { label: '经典', value: 'default' },
    { label: '优雅', value: 'grace' },
    { label: '简洁', value: 'simple' },
];

const legendOptions = [
    { label: '图片下方显示 alt', value: 'alt' },
    { label: '图片下方显示 title', value: 'title' },
    { label: '不显示', value: 'none' },
];

const CODE_BLOCK_THEMES = [
    'a11y-dark.css',
    'a11y-light.css',
    'atom-one-dark.css',
    'atom-one-light.css',
    'github-dark.css',
    'github-light.css',
    'monokai.css',
    'nord.css',
    'obsidian.css',
    'vs2015.css'
];

interface StylePanelProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<IOpts>) => void;
}

const StylePanel = ({ opts, onOptsChange }: StylePanelProps) => {

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
                        value={opts.theme?.name || 'default'}
                        onChange={(e) => handleValueChange('theme', e.target.value)}
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
                        value={opts.theme?.base?.['--md-primary-color'] as string || '#000000'}
                        onChange={(e) => handleValueChange('primaryColor', e.target.value)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>字体大小</label>
                    <input
                        type="text"
                        value={opts.size || '16px'}
                        onChange={(e) => handleValueChange('size', e.target.value)}
                        placeholder="例如: 16px"
                    />
                </div>

                <div className="style-panel-item">
                    <label>代码块主题</label>
                    <select
                        value={opts.codeBlockTheme || 'atom-one-dark.css'}
                        onChange={(e) => handleValueChange('codeBlockTheme', e.target.value)}
                    >
                        {CODE_BLOCK_THEMES.map(theme => (
                            <option key={theme} value={theme}>{theme.replace('.css', '')}</option>
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
                        checked={opts.citeStatus || false}
                        onChange={(e) => handleValueChange('citeStatus', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>字数统计</label>
                    <input
                        type="checkbox"
                        checked={opts.countStatus || false}
                        onChange={(e) => handleValueChange('countStatus', e.target.checked)}
                    />
                </div>
            </form>
        </div>
    );
};

export default StylePanel;
