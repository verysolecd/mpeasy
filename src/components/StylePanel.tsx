import * as React from 'react';
import { useEffect, useState } from 'react';
import type { IOpts } from '../types';
import { getLayoutThemes, getCodeBlockThemes } from '../utils';

interface StylePanelProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<IOpts>) => void;
}

const StylePanel = ({ opts, onOptsChange }: StylePanelProps) => {
    const [layoutThemes, setLayoutThemes] = useState<{name: string, css: string}[]>([]);
    const [codeBlockThemes, setCodeBlockThemes] = useState<{name: string, css: string}[]>([]);

    useEffect(() => {
        const layout = getLayoutThemes();
        const code = getCodeBlockThemes();
        setLayoutThemes(layout);
        setCodeBlockThemes(code);
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
                        value={opts.layoutThemeName || 'default'}
                        onChange={(e) => handleValueChange('layoutThemeName', e.target.value)}
                    >
                        {layoutThemes.map(opt => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
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
                            <option key={theme.name} value={theme.name}>{theme.name}</option>
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
            </form>
        </div>
    );
};

export default StylePanel;
