import { App, PluginSettingTab, Setting } from 'obsidian';
import MpeasyPlugin from '../../main';

export interface MpeasySettings {
    wxid: string;
    wxsecret: string;
    wxtoken: string;
    customCssEnabled: boolean;
    customCssFile: string;
}

export const DEFAULT_SETTINGS: MpeasySettings = {
    wxid: '',
    wxsecret: '',
    wxtoken: '',
    customCssEnabled: false,
    customCssFile: ''
}

export class MpeasySettingsTab extends PluginSettingTab {
    plugin: MpeasyPlugin;

    constructor(app: App, plugin: MpeasyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'MPEasy Settings' });

        new Setting(containerEl)
            .setName('Plugin Info')
            .setDesc('MPEasy: A plugin to render markdown for WeChat Official Accounts.')
            .addExtraButton(button => {
                button.setIcon('info').setTooltip('Author: Your Name');
            });

        new Setting(containerEl)
            .setName('WeChat Public Account ID')
            .setDesc('Your WeChat wxid (AppID).')
            .addText(text => text
                .setPlaceholder('Enter your wxid')
                .setValue(this.plugin.settings.wxid)
                .onChange(async (value) => {
                    this.plugin.settings.wxid = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('WeChat Public Account Secret')
            .setDesc('Your WeChat wxsecret (AppSecret).')
            .addText(text => text
                .setPlaceholder('Enter your wxsecret')
                .setValue(this.plugin.settings.wxsecret)
                .onChange(async (value) => {
                    this.plugin.settings.wxsecret = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('WeChat Public Account Token')
            .setDesc('Your WeChat wxtoken (optional).')
            .addText(text => text
                .setPlaceholder('Enter your wxtoken')
                .setValue(this.plugin.settings.wxtoken)
                .onChange(async (value) => {
                    this.plugin.settings.wxtoken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Custom CSS')
            .setDesc('Load a custom CSS file from your vault.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.customCssEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.customCssEnabled = value;
                    await this.plugin.saveSettings();
                    // Re-render settings to show/hide dropdown
                    this.display(); 
                }));

        if (this.plugin.settings.customCssEnabled) {
            new Setting(containerEl)
                .setName('Custom CSS File')
                .setDesc('Select a .css file from your vault.')
                .addDropdown(dropdown => {
                    const cssFiles = this.app.vault.getFiles().filter(f => f.extension === 'css');
                    cssFiles.forEach(file => {
                        dropdown.addOption(file.path, file.path);
                    });
                    dropdown.setValue(this.plugin.settings.customCssFile);
                    dropdown.onChange(async (value) => {
                        this.plugin.settings.customCssFile = value;
                        await this.plugin.saveSettings();
                    });
                });
        }
    }
}