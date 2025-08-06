import { ItemView, WorkspaceLeaf, Editor, TFile } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import MPEasyViewComponent from "./components/MPEasyViewComponent";
import type MPEasyPlugin from "./main";

export const VIEW_TYPE_MPEASY = "mpeasy-preview-view";

export class MPEasyView extends ItemView {
    private plugin: MPEasyPlugin;
    private root: Root | null = null;
    private linkedFile: TFile | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MPEasyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    // This method will be called by the React component to update the view content
    renderComponent = (file: TFile) => {
        this.linkedFile = file;
        const container = this.containerEl.children[1];
        if (!this.root) {
            this.root = createRoot(container);
        }

        const mermaidPath = this.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/mermaid.js`);
        const mathjaxPath = this.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/mathjax.js`);

        const component = React.createElement(MPEasyViewComponent, { 
            file: file, 
            app: this.app, 
            plugin: this.plugin,
            customCss: this.plugin.customCss,
            mermaidPath: mermaidPath,
            mathjaxPath: mathjaxPath,
        });
        this.root.render(component);
    }

    // Updated handler to be more specific
    editorChangeHandler = (editor: Editor, file: TFile) => {
        if (this.linkedFile && file.path === this.linkedFile.path) {
            const content = editor.getValue();
            // Here we assume the React component handles its own state updates
            // For simplicity, we re-render. A more advanced implementation
            // would use a state management solution or refs.
            this.renderComponent(file);
        }
    }

    getViewType() {
        return VIEW_TYPE_MPEASY;
    }

    getDisplayText() {
        return this.linkedFile ? `MPEasy: ${this.linkedFile.basename}` : "MPEasy 预览";
    }

    async onOpen() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            this.renderComponent(activeFile);
        }

        this.registerEvent(
            this.app.workspace.on('editor-change', (editor, info) => this.editorChangeHandler(editor, info.file))
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}