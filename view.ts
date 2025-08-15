import { ItemView, WorkspaceLeaf, Editor, TFile } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import MPEasyViewComponent from "./src/components/MPEasyViewComponent";
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
            settings: this.plugin.settings,
            customCss: this.plugin.customCss,
            mermaidPath: mermaidPath,
            mathjaxPath: mathjaxPath,
        });
        this.root.render(component);
    }

    // Debounce function
    debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    // Debounced render function
    debouncedRender = this.debounce((file: TFile) => {
        this.renderComponent(file);
    }, 500);

    // Updated handler to be more specific
    editorChangeHandler = (editor: Editor, file: TFile) => {
        if (this.linkedFile && file.path === this.linkedFile.path) {
            // Use the debounced function to render
            this.debouncedRender(file);
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

        // 监听编辑器内容变化
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor, info) => this.editorChangeHandler(editor, info.file))
        );
        
        // 监听文件切换事件
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                if (file) {
                    this.renderComponent(file);
                }
            })
        );
        
        // 监听活动文件变化
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.renderComponent(activeFile);
                }
            })
        );

        // 监听布局变化 (包括视图模式切换)
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && this.linkedFile && activeFile.path === this.linkedFile.path) {
                    this.renderComponent(activeFile);
                }
            })
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}