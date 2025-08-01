import { ItemView, WorkspaceLeaf, Editor } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";
import MPEasyViewComponent from "./components/MPEasyViewComponent";
import type MPEasyPlugin from "./main";

export const VIEW_TYPE_MPEASY = "mpeasy-preview-view";

export class MPEasyView extends ItemView {
    private plugin: MPEasyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MPEasyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    renderComponent = (content: string) => {
        const component = React.createElement(MPEasyViewComponent, { 
            markdownContent: content, 
            app: this.app, 
            plugin: this.plugin 
        });
        // @ts-ignore
        ReactDOM.render(component, this.containerEl.children[1]);
    }

    editorChangeHandler = (editor: Editor) => {
        const content = editor.getValue();
        this.renderComponent(content);
    }

    getViewType() {
        return VIEW_TYPE_MPEASY;
    }

    getDisplayText() {
        return "MPEasy 预览";
    }

    async onOpen() {
        const activeEditor = this.app.workspace.activeEditor?.editor;
        const initialContent = activeEditor ? activeEditor.getValue() : "# 请打开一个 Markdown 文件进行预览";
        this.renderComponent(initialContent);

        this.registerEvent(
            this.app.workspace.on('editor-change', this.editorChangeHandler)
        );
    }

    async onClose() {
        // @ts-ignore
        ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
    }
}
