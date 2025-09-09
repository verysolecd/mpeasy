import { App, PluginSettingTab, Setting } from 'obsidian';
import MPEasyPlugin from './main';
import { getAccessToken } from './wx/api';

export class MPEasySettingTab extends PluginSettingTab {
    plugin: MPEasyPlugin;

    constructor(app: App, plugin: MPEasyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'MPEasy Settings' });

        const descEl = containerEl.createEl('p');
        descEl.setText('All styling-related settings are now available in the side panel of the MPEasy Preview view. Open a preview to get started!');

        containerEl.createEl('h2', { text: '微信公众号设置' });

        new Setting(containerEl)
            .setName("公众号ID")
            .setDesc("Your WeChat Official Account ID (AppID).")
            .addText((text) => {
                text.setPlaceholder('Enter your AppID')
                    .setValue(this.plugin.settings.wxId)
                    .onChange(async (value) => {
                        this.plugin.settings.wxId = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("公众号Secret")
            .setDesc("Your WeChat Official Account Secret (AppSecret).")
            .addText((text) => {
                text.setPlaceholder('Enter your AppSecret')
                    .setValue(this.plugin.settings.wxSecret)
                    .onChange(async (value) => {
                        this.plugin.settings.wxSecret = value;
                        await this.plugin.saveSettings();
                    });
            });

        let tokenInput: HTMLInputElement;
        let getTokenButton: HTMLButtonElement;
        new Setting(containerEl)
            .setName("公众号Token")
            .setDesc("The access token for the WeChat API. This will be fetched automatically.")
            .addText((text) => {
                tokenInput = text.inputEl;
                text.setValue(this.plugin.settings.wxToken).setDisabled(true);
            })
            .addButton((button) => {
                getTokenButton = button.buttonEl;
                button.setButtonText("获取Token").onClick(async () => {
                    getTokenButton.setAttr('disabled', 'true');
                    const originalButtonText = button.buttonText;
                    button.setButtonText("获取中...");
                    try {
                        const token = await getAccessToken(this.plugin.settings.wxId, this.plugin.settings.wxSecret);
                        this.plugin.settings.wxToken = token;
                        this.plugin.settings.wxTokenAcquisitionTime = Date.now(); // Save acquisition time
                        await this.plugin.saveSettings();
                        tokenInput.value = token;
                        button.setButtonText("获取成功!");
                    } catch (error) {
                        console.error("Failed to get token:", error);
                        button.setButtonText("获取失败!");
                        alert(`Failed to get token: ${error.message}`);
                    } finally {
                        setTimeout(() => {
                            button.setButtonText(originalButtonText);
                            getTokenButton.removeAttribute('disabled');
                        }, 2000);
                    }
                });
            });
    }
}
