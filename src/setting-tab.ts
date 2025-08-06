import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import MPEasyPlugin from "./main";
import { wxGetToken } from "./core/wechatApi";
import { themeOptions } from "./core/theme";

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

        containerEl.createEl('h2', {text: '排版与功能设置'});

        new Setting(containerEl)
            .setName('启用自定义 CSS')
            .setDesc('开启后，将加载插件根目录下 assets/custom.css 文件中的样式。')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useCustomCSS)
                .onChange(async (value) => {
                    this.plugin.settings.useCustomCSS = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('主题选择')
            .addDropdown(dropdown => {
                for (const option of themeOptions) {
                    dropdown.addOption(option.value, option.label);
                }
                dropdown.setValue(this.plugin.settings.themeName)
                    .onChange(async (value) => {
                        this.plugin.settings.themeName = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('主颜色')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.primaryColor)
                .onChange(async (value) => {
                    this.plugin.settings.primaryColor = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('字体大小')
            .addText(text => text
                .setPlaceholder('例如: 16px')
                .setValue(this.plugin.settings.fontSize)
                .onChange(async (value) => {
                    this.plugin.settings.fontSize = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('代码块主题')
            .addDropdown(dropdown => {
                for (const theme of CODE_BLOCK_THEMES) {
                    dropdown.addOption(theme, theme.replace('.css', ''));
                }
                dropdown.setValue(this.plugin.settings.codeBlockTheme)
                    .onChange(async (value) => {
                        this.plugin.settings.codeBlockTheme = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('首行缩进')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isUseIndent)
                .onChange(async (value) => {
                    this.plugin.settings.isUseIndent = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Mac 风格代码块')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isMacCodeBlock)
                .onChange(async (value) => {
                    this.plugin.settings.isMacCodeBlock = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('文末引用链接')
            .setDesc('在文章末尾追加引用的外部链接')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isCiteStatus)
                .onChange(async (value) => {
                    this.plugin.settings.isCiteStatus = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('统计网站字数')
            .setDesc('在文章末尾显示字数和阅读时间')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isCountStatus)
                .onChange(async (value) => {
                    this.plugin.settings.isCountStatus = value;
                    await this.plugin.saveSettings();
                }));
	}
}