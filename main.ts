import { Plugin } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './view';
import { MPEasySettings, DEFAULT_SETTINGS } from './src/settings';
import { MPEasySettingTab } from './src/setting-tab';

const STYLES = `
.mpeasy-view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.mpeasy-view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--background-modifier-border);
}

.mpeasy-header-title {
    margin: 0;
    font-size: 1.2em;
}

.mpeasy-main-content {
    display: flex;
    flex-grow: 1;
    height: calc(100% - 50px); /* Adjust based on header height */
}

.mpeasy-preview-wrapper {
    flex-grow: 1;
    padding: 15px;
    overflow-y: auto;
}

/* Style Panel Styles */
.style-panel-container {
    padding: 10px;
    border-left: 1px solid var(--background-modifier-border);
}

.style-panel-title {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.1em;
}

.style-panel-form .style-panel-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.style-panel-form label {
    font-size: 0.9em;
}

.style-panel-form select,
.style-panel-form input {
    max-width: 60%;
}
`;

export default class MPEasyPlugin extends Plugin {
    settings: MPEasySettings;
    styleEl: HTMLElement;

    async onload() {
        console.log('正在加载 MPEasy 插件');
        await this.loadSettings();

        this.addSettingTab(new MPEasySettingTab(this.app, this));

        this.styleEl = document.createElement('style');
        this.styleEl.id = 'mpeasy-styles';
        this.styleEl.innerHTML = STYLES;
        document.head.appendChild(this.styleEl);

        this.registerView(
            VIEW_TYPE_MPEASY,
            (leaf) => new MPEasyView(leaf, this)
        );

        this.addRibbonIcon('file-text', '打开 MPEasy 预览', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-mpeasy-preview',
            name: '打开 MPEasy 预览',
            callback: () => {
                this.activateView();
            },
        });
    }

    onunload() {
        console.log('正在卸载 MPEasy 插件');
        this.styleEl.remove();
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_MPEASY);

        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (rightLeaf) {
            await rightLeaf.setViewState({
                type: VIEW_TYPE_MPEASY,
                active: true,
            });
            this.app.workspace.revealLeaf(rightLeaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}