import { ItemView, WorkspaceLeaf } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap, themeOptions } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';

export const VIEW_TYPE_MPEASY = "mpeasy-view";

export class MPEasyView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
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

        const headerDiv = container.createDiv({ cls: "mpeasy-header" });
        headerDiv.createEl("h2", { text: "MPEasy Preview" });
        const copyButton = headerDiv.createEl("button", { text: "Copy HTML" });

        // Placeholder for rendered content
        const contentDiv = container.createDiv();
        contentDiv.id = "mpeasy-rendered-content";
        contentDiv.style.padding = "1em";
        contentDiv.style.overflowY = "auto";
        contentDiv.style.height = "calc(100% - 50px)"; // Adjust height as needed

        // Initialize renderer with a default theme
        const defaultOpts = {
            theme: themeMap.default,
            fonts: "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
            size: "16px",
            isUseIndent: false,
            isUseJustify: false,
            legend: "alt",
            citeStatus: false,
            countStatus: false,
            isMacCodeBlock: true,
        };
        const renderer = initRenderer(defaultOpts);

        // Get current active Markdown file content
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const markdownContent = await this.app.vault.read(activeFile);
            const { html, readingTime } = renderMarkdown(markdownContent, renderer);
            const finalHtml = postProcessHtml(html, readingTime, renderer);
            contentDiv.innerHTML = finalHtml;

            copyButton.onclick = async () => {
                try {
                    await copyHtml(contentDiv.innerHTML);
                    copyButton.setText("Copied!");
                    setTimeout(() => copyButton.setText("Copy HTML"), 2000);
                } catch (err) {
                    console.error("Failed to copy HTML: ", err);
                    copyButton.setText("Failed!");
                    setTimeout(() => copyButton.setText("Copy HTML"), 2000);
                }
            };
        } else {
            contentDiv.createEl("p", { text: "No active Markdown file to preview." });
            copyButton.disabled = true;
        }
    }

    async onClose() {
        // Nothing to clean up yet
    }
}
