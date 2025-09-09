import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './MPEasyView';
import { MPEasySettingTab } from './MPEasySettingTab';
import { MPEasySettings, StyleSettings } from './shared/types/settings';
import { DEFAULT_STYLE_SETTINGS } from './shared/configs/defaults';

const DEFAULT_SETTINGS: MPEasySettings = {
    styleSettings: DEFAULT_STYLE_SETTINGS,
};

export default class MPEasyPlugin extends Plugin {
    settings: MPEasySettings;

    async onload() {
        console.log('Loading MPEasy Plugin');

        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_MPEASY,
            (leaf) => new MPEasyView(leaf, this)
        );

        this.addSettingTab(new MPEasySettingTab(this.app, this));

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

    onunload() {
        console.log('Unloading MPEasy Plugin');
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_MPEASY);
    }

    async activateView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY);
        if (leaves.length > 0) {
            const leaf = leaves[0];
            const view = leaf.view as MPEasyView;
            await view.rerender();
            this.app.workspace.revealLeaf(leaf);
        } else {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_MPEASY);
            await this.app.workspace.getRightLeaf(false).setViewState({
                type: VIEW_TYPE_MPEASY,
                active: true,
            });
            this.app.workspace.revealLeaf(
                this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY)[0]
            );
        }
    }

    async loadSettings() {
        const loadedData = await this.loadData();
        // Deep merge to ensure new settings are applied
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...loadedData,
            styleSettings: {
                ...DEFAULT_SETTINGS.styleSettings,
                ...(loadedData?.styleSettings || {}),
            },
        };
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}