import { ItemView, WorkspaceLeaf } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap, themeOptions } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';
import MPEasyPlugin from './main'; // Import the plugin class for type hinting

import * as React from 'react';
import * as ReactDOM from 'react-dom/client'; // For React 18
import SidePanel from './components/SidePanel'; // Import the React SidePanel component

export const VIEW_TYPE_MPEASY = "mpeasy-view";

export class MPEasyView extends ItemView {
    plugin: MPEasyPlugin; // Declare plugin property
    private contentDiv: HTMLElement; // Reference to the content div
    private reactRoot: ReactDOM.Root; // Reference to the React root

    constructor(leaf: WorkspaceLeaf, plugin: MPEasyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_MPEASY;
    }

    getDisplayText() {
        return "MPEasy Preview";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("mpeasy-main-container"); // Add class for flexbox

        // --- Left (Render) Area ---
        const renderAreaDiv = container.createDiv({ cls: "mpeasy-render-area" });
        const headerDiv = renderAreaDiv.createDiv({ cls: "mpeasy-header" });
        headerDiv.createEl("h2", { text: "MPEasy Preview" });
        const copyButton = headerDiv.createEl("button", { text: "Copy HTML" });

        this.contentDiv = renderAreaDiv.createDiv(); // Assign to class property
        this.contentDiv.id = "mpeasy-rendered-content";
        this.contentDiv.style.padding = "1em";
        this.contentDiv.style.overflowY = "auto";

        // Initial render
        await this.updateRenderedContent(this.plugin.settings);

        copyButton.onclick = async () => {
            try {
                await copyHtml(this.contentDiv.innerHTML);
                copyButton.setText("Copied!");
                setTimeout(() => copyButton.setText("Copy HTML"), 2000);
            } catch (err) {
                console.error("Failed to copy HTML: ", err);
                copyButton.setText("Failed!");
                setTimeout(() => copyButton.setText("Copy HTML"), 2000);
            }
        };

        // --- Right (Side Panel) Area (React Component) ---
        const sidePanelContainer = container.createDiv({ cls: "mpeasy-side-panel" });
        sidePanelContainer.createEl("h2", { text: "Side Panel Settings" }); // Semantic label

        // Create a div for React to render into
        const reactRootDiv = sidePanelContainer.createDiv({ cls: "mpeasy-react-root" });
        this.reactRoot = ReactDOM.createRoot(reactRootDiv);

        // Callback to update plugin settings and re-render content
        const onOptsChange = async (newPartialOpts: Partial<MPEasyPlugin['settings']>) => {
            Object.assign(this.plugin.settings, newPartialOpts);
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // Render the React SidePanel component
        this.reactRoot.render(
            <SidePanel
                plugin={this.plugin}
                onOptsChange={onOptsChange}
            />
        );
    }

    async onClose() {
        // Unmount React component when view is closed
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }

    public async rerender() {
        await this.updateRenderedContent(this.plugin.settings);
    }

    // New method to handle rendering based on current settings
    async updateRenderedContent(settings: MPEasyPlugin['settings']) {
        const defaultOpts = {
            theme: themeMap[settings.layoutThemeName] || themeMap.default, // Use layoutThemeName
            fonts: "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
            size: settings.fontSize,
            isUseIndent: settings.isUseIndent,
            isUseJustify: settings.isUseJustify,
            legend: settings.legend,
            citeStatus: settings.citeStatus,
            countStatus: settings.countStatus,
            isMacCodeBlock: settings.isMacCodeBlock,
            primaryColor: settings.primaryColor,
            // Add other settings from MPEasySettings to defaultOpts as needed
        };
        const renderer = initRenderer(defaultOpts);

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const markdownContent = await this.app.vault.read(activeFile);
            let { html, readingTime } = renderMarkdown(markdownContent, renderer);
            let finalHtml = postProcessHtml(html, readingTime, renderer);

            if (settings.codeThemeName && settings.codeThemeName !== 'none') {
                try {
                    const codeThemeCss = await this.app.vault.adapter.read(settings.codeThemeName);
                    finalHtml += `<style>${codeThemeCss}</style>`;
                } catch (error) {
                    console.error(`Error loading code block theme ${settings.codeThemeName}:`, error);
                }
            }

            this.contentDiv.innerHTML = finalHtml;
        } else {
            this.contentDiv.empty(); // Clear previous content
            this.contentDiv.createEl("p", { text: "No active Markdown file to preview." });
        }
    }
}

