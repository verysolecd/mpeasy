import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './MPEasyView';

// Define the settings interface
interface MPEasySettings {
    theme: string;
    fontSize: string;
    isUseIndent: boolean;
    isUseJustify: boolean;
    legend: string;
    citeStatus: boolean;
    countStatus: boolean;
    isMacCodeBlock: boolean;
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

