import { ItemView, WorkspaceLeaf, TFile, Vault } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import App from '../view';

export const MPEASY_VIEW_TYPE = 'mpeasy-view';

export class MpeasyView extends ItemView {
    private root: Root | null = null;
    private fileContent: string = '';
    private cssContent: string = '';

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.onFileModified = this.onFileModified.bind(this);
        this.handleActiveLeafChange = this.handleActiveLeafChange.bind(this);
    }

    getViewType() {
        return MPEASY_VIEW_TYPE;
    }

    getDisplayText() {
        return 'MPEasy Preview';
    }

    async onOpen() {
        // Use the stable contentEl for rendering
        this.contentEl.empty();
        this.contentEl.style.height = '100%';
        const rootEl = this.contentEl.createEl('div');
        rootEl.id = 'mpeasy-react-root';
        rootEl.style.height = '100%';

        this.root = createRoot(rootEl);
        
        await this.loadCss();

        this.registerEvent(this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange));
        this.registerEvent(this.app.vault.on('modify', this.onFileModified));
        
        this.updateContent(this.app.workspace.getActiveFile());
    }

    async onClose() {
        this.root?.unmount();
    }

    handleActiveLeafChange() {
        this.updateContent(this.app.workspace.getActiveFile());
    }

    async onFileModified(file: TFile) {
        // Only update if the modified file is the one we are viewing
        const activeFile = this.app.workspace.getActiveFile();
        if (file === activeFile) {
            this.updateContent(file);
        }
    }

    async updateContent(file: TFile | null) {
        if (file) {
            this.fileContent = await this.app.vault.cachedRead(file);
        } else {
            this.fileContent = '# MPEasy\n\nOpen a markdown file to see the preview.';
        }
        this.renderView();
    }

    async loadCss() {
        const cssPath = `${this.app.vault.configDir}/plugins/mpeasy/styles.css`;
        try {
            const adapter = this.app.vault.adapter;
            if (await adapter.exists(cssPath)) {
                this.cssContent = await adapter.read(cssPath);
            } else {
                console.error('MPEasy: styles.css not found!');
                this.cssContent = ''; // Ensure it's a string
            }
        } catch (error) {
            console.error('MPEasy: Error loading styles.css', error);
        }
    }

    renderView() {
        if (this.root) {
            const props = { 
                fileContent: this.fileContent, 
                cssContent: this.cssContent 
            };
            this.root.render(
                <React.StrictMode>
                    <App {...props} />
                </React.StrictMode>
            );
        }
    }
}
