import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { VIEW_TYPE_MPEASY } from './constants';
import RenderContainer from './ui/RenderContainer';

export class MPEasyRenderView extends ItemView {
    private root: Root | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_MPEASY;
    }

    getDisplayText() {
        return 'MPEasy Renderer';
    }

    getIcon() {
        return 'file-text';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        this.root = createRoot(container);
        this.root.render(
            <React.StrictMode>
                <RenderContainer app={this.app} />
            </React.StrictMode>
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}
