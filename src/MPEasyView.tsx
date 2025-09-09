import { ItemView, WorkspaceLeaf, App, TFile } from 'obsidian';
import { initRenderer } from './renderer/renderer/renderer-impl';
import { themeMap } from './shared/configs/theme';
import { renderMarkdown, postProcessHtml } from './renderer/utils/markdownHelpers';
import { copyHtml } from './utils/clipboard';
import MPEasyPlugin from './main';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import { StyleSettings } from './shared/types/settings';
import { getAccessToken, uploadContentImage, uploadThumb, addDraft } from './wx/api';
import { getMimeTypeFromFilename } from './shared/utils/fileHelpers';
import { getCoverImagePath } from './utils/frontmatter';

export const VIEW_TYPE_MPEASY = "mpeasy-view";

// Helper function to convert Data URI to Blob
function dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

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
        this.sendToWeChatDraft = this.sendToWeChatDraft.bind(this);
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
                onSendToDraft={this.sendToWeChatDraft}
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

    async sendToWeChatDraft(): Promise<void> {
        const { wxId, wxSecret, wxToken, wxTokenAcquisitionTime } = this.plugin.settings;
        const TOKEN_EXPIRATION_SECONDS = 7000;

        if (!wxId || !wxSecret) {
            alert("请在插件设置中配置公众号ID和Secret。");
            return;
        }

        let currentToken = wxToken;
        if (!currentToken || !wxTokenAcquisitionTime || (Date.now() - wxTokenAcquisitionTime) / 1000 > TOKEN_EXPIRATION_SECONDS) {
            try {
                currentToken = await getAccessToken(wxId, wxSecret);
                this.plugin.settings.wxToken = currentToken;
                this.plugin.settings.wxTokenAcquisitionTime = Date.now();
                await this.plugin.saveSettings();
                alert("Access Token已更新。");
            } catch (error) {
                alert(`无法获取Access Token: ${error.message}`);
                return;
            }
        }

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            alert("No active file.");
            return;
        }

        // 1. Handle Cover Image
        let thumb_media_id: string | undefined = undefined;
        try {
            const coverPath = getCoverImagePath(this.app, activeFile);
            let coverFile: TFile | null = null;

            if (coverPath === 'default_banner') {
                const defaultBannerPath = `${this.plugin.manifest.dir}/assets/images/banner.png`;
                const abstractFile = this.app.vault.getAbstractFileByPath(defaultBannerPath);
                if (abstractFile instanceof TFile) {
                    coverFile = abstractFile;
                } else {
                    alert('Default banner image not found! Looked at: ' + defaultBannerPath);
                }
            } else {
                const abstractFile = this.app.vault.getAbstractFileByPath(coverPath);
                if (abstractFile instanceof TFile) {
                    coverFile = abstractFile;
                } else {
                    alert(`Cover image not found at path: ${coverPath}`);
                }
            }

            if (coverFile) {
                const arrayBuffer = await this.app.vault.readBinary(coverFile);
                const mimeType = getMimeTypeFromFilename(coverFile.name);
                const blob = new Blob([arrayBuffer], { type: mimeType });
                thumb_media_id = await uploadThumb(currentToken, blob, coverFile.name);
                console.log("Uploaded thumb image. Media ID:", thumb_media_id);
            }
        } catch (error) {
            console.error('Failed to upload thumb image:', error);
            alert(`上传封面图片失败: ${error.message}`);
            return; // Stop if cover upload fails
        }

        // 2. Handle Content Images
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.contentDiv.innerHTML, 'text/html');
        const imgElements = Array.from(doc.querySelectorAll('img'));

        for (const imgEl of imgElements) {
            const src = imgEl.getAttribute('src');
            if (!src || src.startsWith('http')) continue;

            try {
                let blob: Blob;
                let filename: string;

                if (src.startsWith('data:image/')) {
                    blob = dataURItoBlob(src);
                    filename = `image_${Date.now()}.png`;
                } else {
                    const imageFile = this.app.vault.getAbstractFileByPath(src);
                    if (imageFile instanceof TFile) {
                        const arrayBuffer = await this.app.vault.readBinary(imageFile);
                        blob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(imageFile.name) });
                        filename = imageFile.name;
                    } else {
                        console.warn(`Could not find local image file: ${src}`);
                        continue;
                    }
                }
                const uploadedUrl = await uploadContentImage(currentToken, blob, filename);
                imgEl.setAttribute('src', uploadedUrl);
                console.log('Uploaded content image. New URL:', uploadedUrl);
            } catch (error) {
                console.error(`Failed to upload content image: ${src}`, error);
            }
        }

        const processedHtml = doc.body.innerHTML;

        // 3. Send Draft
        try {
            const draftTitle = activeFile.basename;
            const addDraftResponse = await addDraft(currentToken, draftTitle, processedHtml, { thumb_media_id });
            alert(`草稿已成功发送！Media ID: ${addDraftResponse.media_id}`);
        } catch (error) {
            alert(`发送草稿失败: ${error.message}`);
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