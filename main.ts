import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MpeasyView, MPEASY_VIEW_TYPE } from './src/obsidian/view';
import { MpeasySettings, DEFAULT_SETTINGS, MpeasySettingsTab } from './src/obsidian/settings';

export default class MpeasyPlugin extends Plugin {
    settings: MpeasySettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            MPEASY_VIEW_TYPE,
            (leaf) => new MpeasyView(leaf)
        );

        this.addSettingTab(new MpeasySettingsTab(this.app, this));

        this.addRibbonIcon('document', 'Open MPEasy Preview', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-mpeasy-preview',
            name: 'Open MPEasy Preview',
            callback: () => {
                this.activateView();
            },
        });
    }

    onunload() { }

    async activateView() {
        let leaf: WorkspaceLeaf | null = null;
        const leaves = this.app.workspace.getLeavesOfType(MPEASY_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = this.app.workspace.getLeaf(true);
            await leaf.setViewState({ type: MPEASY_VIEW_TYPE, active: true });
        }

        if (leaf) {
            this.app.workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}