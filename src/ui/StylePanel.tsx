import * as React from 'react';
import { RenderOptions } from '../types';

interface Props {
    options: RenderOptions;
    setOptions: (options: RenderOptions) => void;
}

const SYSTEM_FONT_STACK = "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Helvetica Neue\", Helvetica, Arial, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif;";
const TIMES_NEW_ROMAN = "'Times New Roman', serif";
const GEORGIA = "'Georgia', serif";
const VERDANA = "'Verdana', sans-serif";

const StylePanel: React.FC<Props> = ({ options, setOptions }) => {
    return (
        <div className="mpeasy-style-pane">
            <h2>Style Options</h2>
            <div>
                <label htmlFor="theme-select">Theme:</label>
                <select
                    id="theme-select"
                    value={options.theme}
                    onChange={(e) => setOptions({ ...options, theme: e.target.value })}
                >
                    <option value="wechat">WeChat</option>
                    {/* Add more themes here */}
                </select>
            </div>
            <div>
                <label htmlFor="font-size-input">Font Size:</label>
                <input
                    id="font-size-input"
                    type="number"
                    value={options.fontSize}
                    onChange={(e) => setOptions({ ...options, fontSize: parseInt(e.target.value) })}
                />
            </div>
            <div>
                <label htmlFor="font-family-select">Font Family:</label>
                <select
                    id="font-family-select"
                    value={options.fontFamily}
                    onChange={(e) => setOptions({ ...options, fontFamily: e.target.value })}
                >
                    <option value={SYSTEM_FONT_STACK}>System Default</option>
                    <option value={TIMES_NEW_ROMAN}>Times New Roman</option>
                    <option value={GEORGIA}>Georgia</option>
                    <option value={VERDANA}>Verdana</option>
                    {/* Add more font families here */}
                </select>
            </div>
            <div>
                <label htmlFor="line-height-input">Line Height:</label>
                <input
                    id="line-height-input"
                    type="number"
                    step="0.05"
                    value={options.lineHeight}
                    onChange={(e) => setOptions({ ...options, lineHeight: parseFloat(e.target.value) })}
                />
            </div>
            <div>
                <label htmlFor="paragraph-spacing-input">Paragraph Spacing (em):</label>
                <input
                    id="paragraph-spacing-input"
                    type="number"
                    step="0.05"
                    value={options.paragraphSpacing}
                    onChange={(e) => setOptions({ ...options, paragraphSpacing: parseFloat(e.target.value) })}
                />
            </div>
        </div>
    );
};

export default StylePanel;
