import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import MPEasyPlugin from "./main";
import { wxGetToken } from "./core/wechatApi";

export class MPEasySettingTab extends PluginSettingTab {
	plugin: MPEasyPlugin;

	constructor(app: App, plugin: MPEasyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: '微信公众号设置'});

		new Setting(containerEl)
			.setName('AppID')
			.setDesc('请输入微信公众号的 AppID')
			.addText(text => text
				.setPlaceholder('Enter your AppID')
				.setValue(this.plugin.settings.wxAppId)
				.onChange(async (value) => {
					this.plugin.settings.wxAppId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('AppSecret')
			.setDesc('请输入微信公众号的 AppSecret')
			.addText(text => text
				.setPlaceholder('Enter your AppSecret')
				.setValue(this.plugin.settings.wxSecret)
				.onChange(async (value) => {
					this.plugin.settings.wxSecret = value;
					await this.plugin.saveSettings();
				}));

        new Setting(containerEl)
            .setName("获取 Access Token")
            .setDesc("点击按钮以获取或刷新 Access Token")
            .addButton(button => button
                .setButtonText("获取")
                .onClick(async () => {
                    try {
                        const result = await wxGetToken(this.plugin.settings);
                        if (result.access_token) {
                            this.plugin.settings.wxToken = result.access_token;
                            await this.plugin.saveSettings();
                            new Notice('Access Token 获取成功!');
                        } else {
                            new Notice(`获取失败: ${result.errmsg}`);
                        }
                    } catch (e) {
                        new Notice('获取 Access Token 时发生错误。');
                    }
                }));
	}
}
