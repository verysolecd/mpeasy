import { App, PluginSettingTab, Setting } from 'obsidian';
import MPEasyPlugin from './main';
import { themeMap } from './shared/configs/theme';

export class MPEasySettingTab extends PluginSettingTab {
    plugin: MPEasyPlugin;

    constructor(app: App, plugin: MPEasyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'MPEasy Plugin Settings' });

        // Theme Setting (layoutThemeName)
        new Setting(containerEl)
            .setName("Layout Theme")
            .setDesc("Choose the layout theme for the rendered content.")
            .addDropdown((dropdown) => {
                for (const themeKey in themeMap) {
                    dropdown.addOption(themeKey, themeKey);
                }
                dropdown.setValue(this.plugin.settings.layoutThemeName);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.layoutThemeName = value;
                    await this.plugin.saveData(this.plugin.settings);
                    // No direct re-render here, as this is a global setting tab
                });
            });

        // Code Block Theme Setting (codeThemeName)
        new Setting(containerEl)
            .setName("Code Block Theme")
            .setDesc("Choose the theme for code blocks.")
            .addText((text) => {
                text.setValue(this.plugin.settings.codeThemeName);
                text.onChange(async (value) => {
                    this.plugin.settings.codeThemeName = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Custom Style Setting (customStyleName)
        new Setting(containerEl)
            .setName("Custom Style")
            .setDesc("Specify a custom CSS style to apply.")
            .addText((text) => {
                text.setValue(this.plugin.settings.customStyleName);
                text.onChange(async (value) => {
                    this.plugin.settings.customStyleName = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Primary Color Setting (primaryColor)
        new Setting(containerEl)
            .setName("Primary Color")
            .setDesc("Set the primary color for the rendered content.")
            .addText((text) => {
                text.setValue(this.plugin.settings.primaryColor);
                text.onChange(async (value) => {
                    this.plugin.settings.primaryColor = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Font Size Setting
        new Setting(containerEl)
            .setName("Font Size")
            .setDesc("Set the font size for the rendered content (e.g., 16px, 1em).")
            .addText((text) => {
                text.setValue(this.plugin.settings.fontSize);
                text.onChange(async (value) => {
                    this.plugin.settings.fontSize = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Legend Setting
        new Setting(containerEl)
            .setName("Legend")
            .setDesc("Set the legend style (e.g., 'alt').")
            .addText((text) => {
                text.setValue(this.plugin.settings.legend);
                text.onChange(async (value) => {
                    this.plugin.settings.legend = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Use Indent Setting
        new Setting(containerEl)
            .setName("Use Indent")
            .setDesc("Enable or disable indentation for paragraphs.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.isUseIndent);
                toggle.onChange(async (value) => {
                    this.plugin.settings.isUseIndent = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Use Justify Setting (from original defaultOpts, not in stylePanlel.ts)
        new Setting(containerEl)
            .setName("Use Justify")
            .setDesc("Enable or disable text justification.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.isUseJustify);
                toggle.onChange(async (value) => {
                    this.plugin.settings.isUseJustify = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Cite Status Setting
        new Setting(containerEl)
            .setName("Cite Status")
            .setDesc("Enable or disable citation status display.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.citeStatus);
                toggle.onChange(async (value) => {
                    this.plugin.settings.citeStatus = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Count Status Setting
        new Setting(containerEl)
            .setName("Count Status")
            .setDesc("Enable or disable word count display.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.countStatus);
                toggle.onChange(async (value) => {
                    this.plugin.settings.countStatus = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Mac Code Block Setting
        new Setting(containerEl)
            .setName("Mac Code Block")
            .setDesc("Enable or disable Mac-style code blocks.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.isMacCodeBlock);
                toggle.onChange(async (value) => {
                    this.plugin.settings.isMacCodeBlock = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });

        // Use Custom CSS Setting
        new Setting(containerEl)
            .setName("Use Custom CSS")
            .setDesc("Enable or disable the application of custom CSS.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.useCustomCSS);
                toggle.onChange(async (value) => {
                    this.plugin.settings.useCustomCSS = value;
                    await this.plugin.saveData(this.plugin.settings);
                });
            });
    }
}
