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
import { getAccessToken, uploadImage, addDraft } from './wx/api';
import { getMimeTypeFromFilename } from './shared/utils/fileHelpers';

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
        const TOKEN_EXPIRATION_SECONDS = 7000; // 2 hours is 7200s, use a slightly shorter duration

        if (!wxId || !wxSecret) {
            alert("请在插件设置中配置公众号ID和Secret。");
            return;
        }

        let currentToken = wxToken;
        let currentTokenAcquisitionTime = wxTokenAcquisitionTime;

        // Check token validity
        if (!currentToken || !currentTokenAcquisitionTime || (Date.now() - currentTokenAcquisitionTime) / 1000 > TOKEN_EXPIRATION_SECONDS) {
            console.log("Token missing or expired, re-acquiring...");
            try {
                currentToken = await getAccessToken(wxId, wxSecret);
                this.plugin.settings.wxToken = currentToken;
                this.plugin.settings.wxTokenAcquisitionTime = Date.now();
                await this.plugin.saveSettings();
                alert("Access Token已更新。");
            } catch (error) {
                console.error("Failed to re-acquire access token:", error);
                alert(`无法获取Access Token: ${error.message}`);
                return;
            }
        }

        console.log("Access Token is valid:", currentToken);

        // Image handling logic
        console.log("Starting image processing for WeChat...");
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.contentDiv.innerHTML, 'text/html');
        const imgElements = doc.querySelectorAll('img');

        for (const imgEl of Array.from(imgElements)) {
            const src = imgEl.getAttribute('src');
            if (!src) continue;

            if (src.startsWith('http://') || src.startsWith('https://')) {
                // Web image, keep as is
                console.log('Web image, keeping as is:', src);
            } else if (src.startsWith('data:image/')) {
                // Data URI image, convert to Blob and upload
                console.log('Data URI image, converting to Blob and uploading:', src.substring(0, 50) + '...');
                try {
                    const blob = dataURItoBlob(src);
                    // Generate a filename (e.g., based on timestamp and a random number)
                    const filename = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`; // Assuming PNG for now
                    const uploadedUrl = await uploadImage(currentToken, blob, filename);
                    imgEl.setAttribute('src', uploadedUrl);
                    console.log('Uploaded Data URI image. New URL:', uploadedUrl);
                } catch (error) {
                    console.error('Failed to upload Data URI image:', error);
                    // Decide how to handle failed uploads (e.g., skip, alert user)
                }
            } else {
                // Assume local file path (e.g., Obsidian attachment)
                console.log('Local file image, needs to be read from vault and uploaded:', src);
                try {
                    // Resolve the path to an Obsidian TFile
                    const imageFile = this.app.vault.getAbstractFileByPath(src);
                    if (imageFile instanceof TFile) {
                        // Read the file content as ArrayBuffer
                        const arrayBuffer = await this.app.vault.readBinary(imageFile);
                        const mimeType = getMimeTypeFromFilename(imageFile.name); // Get MIME type from filename
                        const blob = new Blob([arrayBuffer], { type: mimeType });
                        const filename = imageFile.name;
                        const uploadedUrl = await uploadImage(currentToken, blob, filename);
                        imgEl.setAttribute('src', uploadedUrl);
                        console.log('Uploaded local file image. New URL:', uploadedUrl);
                    } else {
                        console.warn('Could not find local image file or it is not a TFile:', src);
                    }
                } catch (error) {
                    console.error('Failed to upload local file image:', error);
                }
            }
        }

        const processedHtml = doc.documentElement.innerHTML;
        console.log("Processed HTML content:", processedHtml);

        // Send draft logic
        try {
            const activeFile = this.app.workspace.getActiveFile();
            const draftTitle = activeFile ? activeFile.basename : 'Untitled Draft';

            const addDraftResponse = await addDraft(currentToken, draftTitle, processedHtml);
            console.log('Draft added successfully:', addDraftResponse);
            alert(`草稿已成功发送！Media ID: ${addDraftResponse.media_id}`);
        } catch (error) {
            console.error('Failed to send draft:', error);
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