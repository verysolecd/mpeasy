import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';
import MPEasyPlugin from './main';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import { StyleSettings } from './shared/types/settings';

export const VIEW_TYPE_MPEASY = "mpeasy-view";

export class MPEasyView extends ItemView {
    plugin: MPEasyPlugin;
    private contentDiv: HTMLElement;
    private reactRoot: ReactDOM.Root;
    private codeThemeStyleEl: HTMLStyleElement | null = null;
    private customCSSStyleEl: HTMLStyleElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MPEasyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.refreshView = this.refreshView.bind(this);
        this.copyRenderedHtml = this.copyRenderedHtml.bind(this);
    }

    getViewType() { return VIEW_TYPE_MPEASY; }
    getDisplayText() { return "MPEasy Preview"; }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("mpeasy-main-container");

        const renderAreaDiv = container.createDiv({ cls: "mpeasy-render-area" });
        const headerDiv = renderAreaDiv.createDiv({ cls: "mpeasy-header" });
        headerDiv.createEl("h2", { text: "MPEasy Preview" });

        this.contentDiv = renderAreaDiv.createDiv({ id: "mpeasy-rendered-content" });
        this.contentDiv.style.padding = "1em";
        this.contentDiv.style.overflowY = "auto";

        this.codeThemeStyleEl = renderAreaDiv.createEl('style', { attr: { id: 'mpeasy-code-theme-style' } });
        this.customCSSStyleEl = renderAreaDiv.createEl('style', { attr: { id: 'mpeasy-custom-css-style' } });

        const sidePanelContainer = container.createDiv({ cls: "mpeasy-side-panel" });
        const reactRootDiv = sidePanelContainer.createDiv({ cls: "mpeasy-react-root" });
        this.reactRoot = ReactDOM.createRoot(reactRootDiv);

        const onOptsChange = async (newPartialOpts: Partial<StyleSettings>) => {
            Object.assign(this.plugin.settings.styleSettings, newPartialOpts);
            await this.plugin.saveSettings();
            await this.refreshView();
        };

        this.reactRoot.render(
            <SidePanel
                styleSettings={this.plugin.settings.styleSettings}
                onOptsChange={onOptsChange}
                app={this.app}
                onRefresh={this.refreshView}
                onCopy={this.copyRenderedHtml}
            />
        );

        await this.refreshView();
    }

    async onClose() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }

    async copyRenderedHtml(): Promise<boolean> {
        try {
            await copyHtml(this.contentDiv.innerHTML);
            return true;
        } catch (err) {
            console.error("Failed to copy HTML: ", err);
            return false;
        }
    }

    async refreshView() {
        const settings = this.plugin.settings.styleSettings;

        // Update styles
        if (!this.customCSSStyleEl || !this.codeThemeStyleEl) return;

        if (settings.codeThemeName && settings.codeThemeName !== 'none') {
            this.app.vault.adapter.read(settings.codeThemeName)
                .then(css => { if (this.codeThemeStyleEl) this.codeThemeStyleEl.innerHTML = css; })
                .catch(err => console.error(`Error loading code theme ${settings.codeThemeName}:`, err));
        } else {
            this.codeThemeStyleEl.innerHTML = '';
        }

        if (settings.useCustomCSS && settings.customStyleName && settings.customStyleName !== 'none') {
            this.app.vault.adapter.read(settings.customStyleName)
                .then(css => { if (this.customCSSStyleEl) this.customCSSStyleEl.innerHTML = css; })
                .catch(err => console.error("Error loading custom CSS", err));
        } else {
            this.customCSSStyleEl.innerHTML = '';
        }

        // Update content
        const defaultOpts = {
            theme: themeMap[settings.layoutThemeName] || themeMap.default,
            fonts: "-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB , Microsoft YaHei UI , Microsoft YaHei ,Arial,sans-serif",
            size: settings.fontSize,
            isUseIndent: settings.isUseIndent,
            isUseJustify: settings.isUseJustify,
            legend: settings.legend,
            citeStatus: settings.isCiteStatus,
            countStatus: settings.isCountStatus,
            isMacCodeBlock: settings.isMacCodeBlock,
            primaryColor: settings.primaryColor,
        };
        const renderer = initRenderer(defaultOpts);

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const markdownContent = await this.app.vault.read(activeFile);
            const { html, readingTime } = renderMarkdown(markdownContent, renderer);
            const finalHtml = postProcessHtml(html, readingTime, renderer);

            this.contentDiv.innerHTML = finalHtml;
        } else {
            this.contentDiv.empty();
            this.contentDiv.createEl("p", { text: "No active Markdown file to preview." });
        }
    }
}