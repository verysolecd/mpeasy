import { Plugin } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './view';
import { MPEasySettings, DEFAULT_SETTINGS } from './src/settings';
import { MPEasySettingTab } from './src/setting-tab';
import STYLES from './styles.css';
import { setBasePath } from './src/utils';

export default class MPEasyPlugin extends Plugin {
    settings: MPEasySettings;
    styleEl: HTMLElement;
    customCss: string;

    async onload() {
        console.log('正在加载 MPEasy 插件');
        await this.loadSettings();

        // Set the base path for utils
        const basePath = (this.app.vault.adapter as any).getBasePath();
        const stylePath = `${basePath}/${this.manifest.dir}/assets/style`;
        setBasePath(stylePath);

        if (this.settings.useCustomCSS) {
            try {
                this.customCss = await this.app.vault.adapter.read(
                    `${this.manifest.dir}/assets/custom.css`
                );
            } catch (e) {
                console.error('Failed to load custom.css', e);
                this.customCss = '';
            }
        } else {
            this.customCss = '';
        }

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
        // 检查是否已存在 MPEasy 视图
        const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MPEASY);
        
        if (existingLeaves.length > 0) {
            // 如果已存在，激活并刷新现有视图
            const existingLeaf = existingLeaves[0];
            this.app.workspace.revealLeaf(existingLeaf);
            
            // 刷新内容：获取当前活动文件并重新渲染
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && existingLeaf.view instanceof MPEasyView) {
                existingLeaf.view.renderComponent(activeFile);
            }
        } else {
            // 如果不存在，创建新视图
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
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.settings.useCustomCSS) {
            try {
                this.customCss = await this.app.vault.adapter.read(
                    `${this.manifest.dir}/assets/custom.css`
                );
            } catch (e) {
                console.error('Failed to load custom.css', e);
                this.customCss = '';
            }
        } else {
            this.customCss = '';
        }
    }
}