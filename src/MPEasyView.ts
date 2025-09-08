import { ItemView, WorkspaceLeaf } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap, themeOptions } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';

import { ItemView, WorkspaceLeaf } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap, themeOptions } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';
import MPEasyPlugin from './main'; // Import the plugin class for type hinting

export const VIEW_TYPE_MPEASY = "mpeasy-view";

export class MPEasyView extends ItemView {
    plugin: MPEasyPlugin; // Declare plugin property
    private contentDiv: HTMLElement; // Reference to the content div

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

        // --- Right (Side Panel) Area ---
        const sidePanelDiv = container.createDiv({ cls: "mpeasy-side-panel" });
        sidePanelDiv.createEl("h2", { text: "Settings" });

        // Theme Setting
        const themeSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        themeSettingDiv.createEl("div", { text: "Theme", cls: "setting-item-name" });
        const themeSelect = themeSettingDiv.createEl("select", { cls: "setting-item-control" });
        for (const themeKey in themeMap) {
            const option = themeSelect.createEl("option", { value: themeKey, text: themeKey });
            if (themeKey === this.plugin.settings.theme) {
                option.selected = true;
            }
        }
        themeSelect.onchange = async (e) => {
            this.plugin.settings.theme = (e.target as HTMLSelectElement).value;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // Font Size Setting
        const fontSizeSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        fontSizeSettingDiv.createEl("div", { text: "Font Size", cls: "setting-item-name" });
        const fontSizeInput = fontSizeSettingDiv.createEl("input", { type: "text", value: this.plugin.settings.fontSize, cls: "setting-item-control" });
        fontSizeInput.onchange = async (e) => {
            this.plugin.settings.fontSize = (e.target as HTMLInputElement).value;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // isUseIndent Setting
        const isUseIndentSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        isUseIndentSettingDiv.createEl("div", { text: "Use Indent", cls: "setting-item-name" });
        const isUseIndentToggle = isUseIndentSettingDiv.createEl("input", { type: "checkbox", cls: "setting-item-control" });
        isUseIndentToggle.checked = this.plugin.settings.isUseIndent;
        isUseIndentToggle.onchange = async (e) => {
            this.plugin.settings.isUseIndent = (e.target as HTMLInputElement).checked;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // isUseJustify Setting
        const isUseJustifySettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        isUseJustifySettingDiv.createEl("div", { text: "Use Justify", cls: "setting-item-name" });
        const isUseJustifyToggle = isUseJustifySettingDiv.createEl("input", { type: "checkbox", cls: "setting-item-control" });
        isUseJustifyToggle.checked = this.plugin.settings.isUseJustify;
        isUseJustifyToggle.onchange = async (e) => {
            this.plugin.settings.isUseJustify = (e.target as HTMLInputElement).checked;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // legend Setting
        const legendSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        legendSettingDiv.createEl("div", { text: "Legend", cls: "setting-item-name" });
        const legendInput = legendSettingDiv.createEl("input", { type: "text", value: this.plugin.settings.legend, cls: "setting-item-control" });
        legendInput.onchange = async (e) => {
            this.plugin.settings.legend = (e.target as HTMLInputElement).value;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // citeStatus Setting
        const citeStatusSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        citeStatusSettingDiv.createEl("div", { text: "Cite Status", cls: "setting-item-name" });
        const citeStatusToggle = citeStatusSettingDiv.createEl("input", { type: "checkbox", cls: "setting-item-control" });
        citeStatusToggle.checked = this.plugin.settings.citeStatus;
        citeStatusToggle.onchange = async (e) => {
            this.plugin.settings.citeStatus = (e.target as HTMLInputElement).checked;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // countStatus Setting
        const countStatusSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        countStatusSettingDiv.createEl("div", { text: "Count Status", cls: "setting-item-name" });
        const countStatusToggle = countStatusSettingDiv.createEl("input", { type: "checkbox", cls: "setting-item-control" });
        countStatusToggle.checked = this.plugin.settings.countStatus;
        countStatusToggle.onchange = async (e) => {
            this.plugin.settings.countStatus = (e.target as HTMLInputElement).checked;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };

        // isMacCodeBlock Setting
        const isMacCodeBlockSettingDiv = sidePanelDiv.createDiv({ cls: "setting-item" });
        isMacCodeBlockSettingDiv.createEl("div", { text: "Mac Code Block", cls: "setting-item-name" });
        const isMacCodeBlockToggle = isMacCodeBlockSettingDiv.createEl("input", { type: "checkbox", cls: "setting-item-control" });
        isMacCodeBlockToggle.checked = this.plugin.settings.isMacCodeBlock;
        isMacCodeBlockToggle.onchange = async (e) => {
            this.plugin.settings.isMacCodeBlock = (e.target as HTMLInputElement).checked;
            await this.plugin.saveData(this.plugin.settings);
            await this.updateRenderedContent(this.plugin.settings);
        };
    }

    async onClose() {
        // Nothing to clean up yet
    }

    // New method to handle rendering based on current settings
    async updateRenderedContent(settings: MPEasyPlugin['settings']) {
        const defaultOpts = {
            theme: themeMap[settings.theme] || themeMap.default,
            fonts: "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
            size: settings.fontSize,
            isUseIndent: settings.isUseIndent,
            isUseJustify: settings.isUseJustify,
            legend: settings.legend,
            citeStatus: settings.citeStatus,
            countStatus: settings.countStatus,
            isMacCodeBlock: settings.isMacCodeBlock,
        };
        const renderer = initRenderer(defaultOpts);

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const markdownContent = await this.app.vault.read(activeFile);
            const { html, readingTime } = renderMarkdown(markdownContent, renderer);
            const finalHtml = postProcessHtml(html, readingTime, renderer);
            this.contentDiv.innerHTML = finalHtml;
        } else {
            this.contentDiv.empty(); // Clear previous content
            this.contentDiv.createEl("p", { text: "No active Markdown file to preview." });
        }
    }
}

