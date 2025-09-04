import { Plugin } from 'obsidian';
import { MPEasyRenderView } from './view';
import { VIEW_TYPE_MPEASY } from './constants';
import { MPEasySettingTab } from './settings';
import { MPEasySettings, DEFAULT_SETTINGS } from './types';

export default class MPEasyPlugin extends Plugin {
    settings: MPEasySettings;

    async onload() {
        console.log('Loading MPEasy Plugin');

        await this.loadSettings();

        this.addSettingTab(new MPEasySettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE_MPEASY,
            (leaf) => new MPEasyRenderView(leaf)
        );

        this.addRibbonIcon('file-text', 'MPEasy Renderer', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-mpeasy-renderer',
            name: 'Open MPEasy Renderer',
            callback: () => {
                this.activateView();
            },
        });
    }

    async onunload() {
        console.log('Unloading MPEasy Plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
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
