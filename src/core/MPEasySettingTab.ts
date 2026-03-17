import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import MPEasyPlugin from './main';
import { getAccessToken } from '../utils/wechat/api';

export class MPEasySettingTab extends PluginSettingTab {
    plugin: MPEasyPlugin;

    constructor(app: App, plugin: MPEasyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'MPEasy Settings' });

        const descEl = containerEl.createEl('p');
        descEl.setText('All styling-related settings are now available in the side panel of the MPEasy Preview view. Open a preview to get started!');

        new Setting(containerEl)
            .setName("文章字体大小")
            .setDesc("设置默认的正文字体大小。此设置与预览侧边栏同步。")
            .addDropdown((dropdown) => {
                const sizes = ['13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px'];
                sizes.forEach(size => dropdown.addOption(size, size));
                dropdown
                    .setValue(this.plugin.settings.styleSettings.fontSize || '16px')
                    .onChange(async (value) => {
                        this.plugin.settings.styleSettings.fontSize = value;
                        await this.plugin.saveSettings();
                    });
            });

        containerEl.createEl('h2', { text: '微信公众号设置' });

        const bannerFiles: Record<string, string> = {};
        const imagePath = `${this.plugin.manifest.dir}/assets/images`;
        try {
            const imageList = await this.app.vault.adapter.list(imagePath);
            for (const filePath of imageList.files) {
                const filename = filePath.split('/').pop();
                if (filename) {
                    bannerFiles[filename] = filename;
                }
            }
        } catch (error) {
            console.error("MPEasy: Could not list banner images.", error);
            bannerFiles['error'] = "Could not load images!";
        }

        new Setting(containerEl)
            .setName("默认封面")
            .setDesc("当文章没有在 frontmatter 中设置封面时，将使用此处的封面。图片来源于插件目录下的 assets/images。")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(bannerFiles)
                    .setValue(this.plugin.settings.defaultCoverBanner)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultCoverBanner = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("格言")
            .setDesc("当frontmatter中epigraph字段为空时，将使用此格言。")
            .addTextArea((text) => {
                text
                    .setPlaceholder("Enter your epigraph")
                    .setValue(this.plugin.settings.epigraph)
                    .onChange(async (value) => {
                        this.plugin.settings.epigraph = value;
                        await this.plugin.saveSettings();
                    });
            });

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
                        new Notice("微信公众号Access Token获取成功");
                        button.setButtonText("获取成功!");
                    } catch (error) {
                        console.error("Failed to get token:", error);
                        button.setButtonText("获取失败!");
                        new Notice(`获取Token失败: ${error.message}`);
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
