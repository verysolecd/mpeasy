import { App, PluginSettingTab, Setting, Notice, requestUrl } from "obsidian";
import MPEasyPlugin from "./main";
import { wxGetToken } from "./sets/weixin-api";

export class MPEasySettingTab extends PluginSettingTab {
	plugin: MPEasyPlugin;

	constructor(app: App, plugin: MPEasyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
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
                        const result = await wxGetToken(this.plugin.settings, requestUrl);

                        if ("error" in result) {
                            new Notice(result.error);
                            return;
                        }

                        const data = await result.json;

                        if (data.access_token) {
                            this.plugin.settings.wxToken = data.access_token;
                            this.plugin.settings.wxTokenTimestamp = Date.now();
                            await this.plugin.saveSettings();
                            new Notice('Access Token 获取成功!');
                        } else {
                            new Notice(`获取失败: ${data.errmsg || 'Unknown error'}`);
                        }
                    } catch (e) {
                        new Notice('获取 Access Token 时发生错误。');
                    }
                }));

        new Setting(containerEl)
            .setName('默认封面图')
            .setDesc('选择一个默认的封面图')
            .addDropdown(dropdown => {
                const imagePath = `${this.plugin.manifest.dir}/assets/images`;
                const images = this.app.vault.adapter.list(imagePath);
                images.then(list => {
                    list.files.forEach(file => {
                        dropdown.addOption(file, file.split('/').pop());
                    });
                });
                dropdown.setValue(this.plugin.settings.defaultBanner)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultBanner = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('加密密码')
            .setDesc('设置一个密码来加密您的密钥。如果设置，密钥将被加密后存储。警告：如果忘记密码，密钥将无法恢复。')
            .addText(text => text
                .setPlaceholder('请输入加密密码')
                .setValue(this.plugin.settings.encryptionPassword)
                .onChange(async (value) => {
                    this.plugin.settings.encryptionPassword = value;
                    await this.plugin.saveSettings();
                }));
	}
}