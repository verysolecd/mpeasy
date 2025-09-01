
import React from 'react';

const SettingItem = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
    <label style={{ marginRight: '10px', whiteSpace: 'nowrap' }}>{label}</label>
    <div>{children}</div>
  </div>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
);

const ColorSwatch = ({ color, onClick }: { color: string, onClick: () => void }) => (
    <button onClick={onClick} style={{ width: '24px', height: '24px', backgroundColor: color, border: '1px solid #ccc', borderRadius: '50%', cursor: 'pointer' }} />
);

interface StylePanelProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
  textIndent: boolean;
  onTextIndentChange: (value: boolean) => void;
  textAlign: boolean;
  onTextAlignChange: (value: boolean) => void;
  macCodeBlocks: boolean;
  onMacCodeBlocksChange: (value: boolean) => void;
  availableCodeThemes: string[];
  codeTheme: string;
  onCodeThemeChange: (theme: string) => void;
  convertLinks: boolean;
  onConvertLinksChange: (value: boolean) => void;
}

const StylePanel: React.FC<StylePanelProps> = (props) => {
  const { 
    theme, onThemeChange,
    accentColor, onAccentColorChange,
    isDarkMode, onToggleDarkMode, 
    fontSize, onFontSizeChange,
    lineHeight, onLineHeightChange,
    textIndent, onTextIndentChange,
    textAlign, onTextAlignChange,
    macCodeBlocks, onMacCodeBlocksChange,
    availableCodeThemes, codeTheme, onCodeThemeChange,
    convertLinks, onConvertLinksChange
  } = props;

  const presetColors = ['#0366d6', '#d73a49', '#28a745', '#6f42c1', '#ea6d2c'];

  return (
    <div className="style-panel" style={{ padding: '10px 15px', borderLeft: '1px solid #ccc', width: '280px', backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '10px', backgroundColor: 'white', marginBottom: '15px' }}>
        <h4 style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>通用设置</h4>
        <SettingItem label="文章主题">
          <select value={theme} onChange={e => onThemeChange(e.target.value)} style={{ maxWidth: '120px' }}>
            <option value="">经典</option>
            <option value="theme-elegant">优雅</option>
            <option value="theme-simple">简洁</option>
          </select>
        </SettingItem>
        <SettingItem label="主题色">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {presetColors.map(color => <ColorSwatch key={color} color={color} onClick={() => onAccentColorChange(color)} />)}
                <input type="color" value={accentColor} onChange={e => onAccentColorChange(e.target.value)} style={{ width: '28px', height: '28px', padding: 0, border: 'none' }} />
            </div>
        </SettingItem>
        <SettingItem label="暗色模式">
          <ToggleSwitch checked={isDarkMode} onChange={onToggleDarkMode} />
        </SettingItem>
        <SettingItem label={`字号: ${fontSize}px`}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => onFontSizeChange(fontSize - 1)}>-</button>
            <button onClick={() => onFontSizeChange(fontSize + 1)}>+</button>
          </div>
        </SettingItem>
        <SettingItem label={`行高: ${lineHeight}`}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => onLineHeightChange(Number((lineHeight - 0.1).toFixed(2)))}>-</button>
            <button onClick={() => onLineHeightChange(Number((lineHeight + 0.1).toFixed(2)))}>+</button>
          </div>
        </SettingItem>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '10px', backgroundColor: 'white', marginBottom: '15px' }}>
        <h4 style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>排版优化</h4>
        <SettingItem label="首行缩进">
          <ToggleSwitch checked={textIndent} onChange={onTextIndentChange} />
        </SettingItem>
        <SettingItem label="两端对齐">
          <ToggleSwitch checked={textAlign} onChange={onTextAlignChange} />
        </SettingItem>
        <SettingItem label="外链转引用">
          <ToggleSwitch checked={convertLinks} onChange={onConvertLinksChange} />
        </SettingItem>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '10px', backgroundColor: 'white' }}>
        <h4 style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>代码块</h4>
        <SettingItem label="Mac风格">
          <ToggleSwitch checked={macCodeBlocks} onChange={onMacCodeBlocksChange} />
        </SettingItem>
        <SettingItem label="代码主题">
          <select value={codeTheme} onChange={e => onCodeThemeChange(e.target.value)} style={{ maxWidth: '120px' }}>
            {(availableCodeThemes || []).map(theme => (
              <option key={theme} value={theme}>{theme.replace('.css', '')}</option>
            ))}
          </select>
        </SettingItem>
      </div>
    </div>
  );
};

export default StylePanel;
