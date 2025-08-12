import { Plugin } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './view';
import { MPEasySettings, DEFAULT_SETTINGS } from './src/settings';
import { MPEasySettingTab } from './src/setting-tab';
import STYLES from './styles.css';
import { encrypt, decrypt } from './src/utils';

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
        const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY);
        
        if (existingLeaves.length > 0) {
            const existingLeaf = existingLeaves[0];
            this.app.workspace.revealLeaf(existingLeaf);
            
            const activeFile = this.app.workspace.getActiveFile();
            // The onOpen method of MPEasyView will handle the initial rendering
            // if (activeFile && existingLeaf.view instanceof MPEasyView) {
            //     existingLeaf.view.renderComponent(activeFile);
            // }
        } else {
            const rightLeaf = this.app.workspace.getRightLeaf(false);
            if (rightLeaf) {
                await rightLeaf.setViewState({
                    type: VIEW_TYPE_MPEASY,
                    active: true,
                });
                this.app.workspace.revealLeaf(rightLeaf);
            }
        }
    }

    async loadSettings() {
        const loadedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        
        if (this.settings.encryptionPassword) {
            this.settings.wxAppId = decrypt(this.settings.wxAppId, this.settings.encryptionPassword);
            this.settings.wxSecret = decrypt(this.settings.wxSecret, this.settings.encryptionPassword);
            this.settings.wxToken = decrypt(this.settings.wxToken, this.settings.encryptionPassword);
        }
        
        if (loadedData) {
            if (loadedData.themeName && !loadedData.layoutThemeName) {
                this.settings.layoutThemeName = loadedData.themeName;
            }
            if (loadedData.codeBlockTheme && !loadedData.codeThemeName) {
                this.settings.codeThemeName = loadedData.codeBlockTheme;
            }
            
            delete this.settings.themeName;
            delete this.settings.codeBlockTheme;
        }
    }

    async saveSettings() {
        const settingsToSave = { ...this.settings };
        if (settingsToSave.encryptionPassword) {
            settingsToSave.wxAppId = encrypt(settingsToSave.wxAppId, settingsToSave.encryptionPassword);
            settingsToSave.wxSecret = encrypt(settingsToSave.wxSecret, settingsToSave.encryptionPassword);
            settingsToSave.wxToken = encrypt(settingsToSave.wxToken, settingsToSave.encryptionPassword);
        }
        await this.saveData(settingsToSave);
        this.refreshViews();
    }

    refreshViews() {
        this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY).forEach(leaf => {
            if (leaf.view instanceof MPEasyView) {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    leaf.view.renderComponent(activeFile);
                }
            }
        });
    }
}