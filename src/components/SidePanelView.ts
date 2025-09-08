import { App, Setting } from 'obsidian';
import { IOpts, MPEasySettings } from '../shared/types';
import { getLayoutThemes, getCodeBlockThemes, getCustomStyles } from '../utils/themeHelpers';

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

export class SidePanelView {
    private containerEl: HTMLElement;
    private opts: Partial<IOpts>;
    private app: App;
    public onOptsChange: (newOpts: Partial<MPEasySettings>) => void;

    constructor(containerEl: HTMLElement, initialOpts: Partial<IOpts>, app: App) {
        this.containerEl = containerEl;
        this.opts = initialOpts;
        this.app = app;
        this.containerEl.addClass('style-panel-container');
    }

    public async render() {
        this.containerEl.empty();

        const titleEl = this.containerEl.createEl('h3', { text: '样式与功能', cls: 'style-panel-title' });
        const formEl = this.containerEl.createEl('form', { cls: 'style-panel-form' });

        this.createThemeSelectors(formEl);
        this.createColorSettings(formEl);
        this.createFontSettings(formEl);
        this.createToggleSettings(formEl);
    }

    private createThemeSelectors(parentEl: HTMLElement) {
        // Layout Theme
        new Setting(parentEl)
            .setName('排版主题')
            .addDropdown(async (dropdown) => {
                const themes = await getLayoutThemes(this.app);
                themes.forEach(theme => dropdown.addOption(theme.path, theme.name));
                dropdown.setValue(this.opts.layoutThemeName || 'minimal')
                    .onChange(value => this.handleValueChange('layoutThemeName', value));
            });

        // Code Block Theme
        new Setting(parentEl)
            .setName('代码块主题')
            .addDropdown(async (dropdown) => {
                const themes = await getCodeBlockThemes(this.app);
                themes.forEach(theme => dropdown.addOption(theme.path, theme.name));
                dropdown.setValue(this.opts.codeThemeName || 'atom-one-dark')
                    .onChange(value => this.handleValueChange('codeThemeName', value));
            });

        // Custom Style
        new Setting(parentEl)
            .setName('自定义样式')
            .addDropdown(async (dropdown) => {
                const styles = await getCustomStyles(this.app);
                styles.forEach(style => dropdown.addOption(style.path, style.name));
                dropdown.setValue(this.opts.customStyleName || 'none')
                    .onChange(value => this.handleValueChange('customStyleName', value));
            });
    }

    private createColorSettings(parentEl: HTMLElement) {
        // Preset Colors
        const colorContainer = parentEl.createDiv({ cls: 'style-panel-item-column' });
        colorContainer.createEl('label', { text: '主题色' });
        const presetGrid = colorContainer.createDiv({ cls: 'color-preset-grid' });

        PRESET_COLORS.forEach(preset => {
            const item = presetGrid.createDiv({ cls: 'color-preset-item' });
            if (this.opts.primaryColor === preset.color) {
                item.addClass('selected');
            }
            item.onclick = () => this.handleValueChange('primaryColor', preset.color);

            item.createDiv({ cls: 'color-swatch', attr: { style: `background-color: ${preset.color}` } });
            item.createEl('span', { text: preset.name });
        });

        // Custom Color
        const customColorContainer = parentEl.createDiv({ cls: 'style-panel-item-column' });
        customColorContainer.createEl('label', { text: '自定义主题色' });
        new Setting(customColorContainer)
            .addText(text => {
                text.setValue(this.opts.primaryColor || '#007bff')
                    .onChange(value => this.handleValueChange('primaryColor', value));
            })
            .addColorPicker(color => {
                color.setValue(this.opts.primaryColor || '#007bff')
                    .onChange(value => this.handleValueChange('primaryColor', value));
            });
    }

    private createFontSettings(parentEl: HTMLElement) {
        // Font Size
        new Setting(parentEl)
            .setName('字体大小')
            .addText(text => {
                text.setValue(this.opts.fontSize || '16px')
                    .setPlaceholder('例如: 16px')
                    .onChange(value => this.handleValueChange('fontSize', value));
            });

        // Legend Display
        new Setting(parentEl)
            .setName('图注显示')
            .addDropdown(dropdown => {
                dropdown.addOption('alt', '图片下方显示 alt')
                    .addOption('title', '图片下方显示 title')
                    .addOption('none', '不显示')
                    .setValue(this.opts.legend || 'alt')
                    .onChange(value => this.handleValueChange('legend', value));
            });
    }

    private createToggleSettings(parentEl: HTMLElement) {
        const toggles: { key: keyof MPEasySettings; name: string }[] = [
            { key: 'isUseIndent', name: '首行缩进' },
            { key: 'isMacCodeBlock', name: 'Mac 代码块' },
            { key: 'isCiteStatus', name: '文末引用' },
            { key: 'isCountStatus', name: '字数统计' },
            { key: 'useCustomCSS', name: '启用自定义 CSS' },
        ];

        toggles.forEach(toggleInfo => {
            new Setting(parentEl)
                .setName(toggleInfo.name)
                .addToggle(toggle => {
                    toggle.setValue(this.opts[toggleInfo.key] as boolean || false)
                        .onChange(value => this.handleValueChange(toggleInfo.key, value));
                });
        });
    }

    private handleValueChange(key: keyof MPEasySettings, value: any) {
        this.opts[key] = value;
        if (this.onOptsChange) {
            this.onOptsChange({ [key]: value });
        }
        // Re-render to reflect changes, e.g., selected color
        this.render();
    }
}
