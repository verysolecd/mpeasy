import { Plugin, WorkspaceLeaf } from 'obsidian';
import { MPEasyView, VIEW_TYPE_MPEASY } from './MPEasyView';

export default class MPEasyPlugin extends Plugin {

    async onload() {
        console.log('Loading MPEasy Plugin');

        this.registerView(
            VIEW_TYPE_MPEASY,
            (leaf) => new MPEasyView(leaf)
        );

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

