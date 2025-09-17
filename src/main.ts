import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './core/MPEasyView';
import { MPEasySettingTab } from './core/MPEasySettingTab';
import { MPEasySettings, StyleSettings } from './utils/config/types/settings';
import { DEFAULT_STYLE_SETTINGS } from './utils/config/configs/defaults';

// Syntax error for testing build failure handling
const DEFAULT_SETTINGS: MPEasySettings = {
    styleSettings: DEFAULT_STYLE_SETTINGS,
    wxId: '',
    wxSecret: '',
    wxToken: '',
    wxTokenAcquisitionTime: 0,
    defaultCoverBanner: 'banner.png',
    isCommentDisabled: false,
    isFansOnlyComment: false,
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

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async () => {
                const mpeasyLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY)[0];
                if (mpeasyLeaf) {
                    const mpeasyView = mpeasyLeaf.view as MPEasyView;
                    await mpeasyView.refreshView();
                }
            })
        );

        // 使用打开的信封图标作为ribbon按钮
        this.addRibbonIcon('mail-open', 'Open MPEasy Preview', () => {
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
            await view.refreshView();
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

