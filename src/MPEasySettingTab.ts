import { App, PluginSettingTab, Setting } from 'obsidian';
import MPEasyPlugin from './main';

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

    }
}
