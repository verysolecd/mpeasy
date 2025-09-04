import { App, PluginSettingTab } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import MPEasyPlugin from './main';
import Settings from './ui/Settings';

export class MPEasySettingTab extends PluginSettingTab {
    plugin: MPEasyPlugin;
    private root: Root | null = null;

    constructor(app: App, plugin: MPEasyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.root = createRoot(containerEl);
        this.root.render(
            <React.StrictMode>
                <Settings plugin={this.plugin} />
            </React.StrictMode>
        );
    }

    hide(): void {
        this.root?.unmount();
    }
}
