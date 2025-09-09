import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './MPEasyView';
import { MPEasySettingTab } from './MPEasySettingTab'; // Import the new settings tab

// Define the settings interface
interface MPEasySettings {
    theme: string; // Corresponds to layoutThemeName in stylePanlel.ts, but keeping original name for now
    fontSize: string;
    isUseIndent: boolean;
    isUseJustify: boolean;
    legend: string;
    citeStatus: boolean;
    countStatus: boolean;
    isMacCodeBlock: boolean;

    // New settings from stylePanlel.ts
    layoutThemeName: string;
    codeThemeName: string;
    customStyleName: string;
    primaryColor: string;
    useCustomCSS: boolean;
}

// Define default settings
const DEFAULT_SETTINGS: MPEasySettings = {
    theme: "default",
    fontSize: "16px",
    isUseIndent: false,
    isUseJustify: false,
    legend: "alt",
    citeStatus: false,
    countStatus: false,
    isMacCodeBlock: true,

    // New defaults from stylePanlel.ts
    layoutThemeName: "minimal",
    codeThemeName: "atom-one-dark",
    customStyleName: "none",
    primaryColor: "#007bff",
    useCustomCSS: false,
};

export default class MPEasyPlugin extends Plugin {
    settings: MPEasySettings; // Declare settings property

    async onload() {
        console.log('Loading MPEasy Plugin');

        // Load settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Register the main preview view
        this.registerView(
            VIEW_TYPE_MPEASY,
            (leaf) => new MPEasyView(leaf, this) // Pass plugin instance
        );

        // Register the settings tab
        this.addSettingTab(new MPEasySettingTab(this.app, this));

        // Ribbon icon for the main preview
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
}


