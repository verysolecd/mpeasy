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
import { getAccessToken, uploadThumb, addDraft } from './wx/api';
import { getMimeTypeFromFilename } from './shared/utils/fileHelpers';
import { getCoverImage } from './utils/frontmatter';
import { processContent } from './utils/contentProcessor';

export const VIEW_TYPE_MPEASY = "mpeasy-view";

// 使用contentProcessor中的dataURItoBlob函数，此处不再需要定义

export class MPEasyView extends ItemView {
    plugin: MPEasyPlugin;
    private contentDiv: HTMLElement;
    private reactRoot: ReactDOM.Root;
    private codeThemeStyleEl: HTMLStyleElement | null = null;
    private customCSSStyleEl: HTMLStyleElement | null = null;
    
    /**
     * 处理本地图片路径
     * @param activeFile 当前活动文件
     */
    private processLocalImages(activeFile: TFile): void {
        const imgElements = Array.from(this.contentDiv.querySelectorAll('img[data-local-image="true"]'));

        for (const imgEl of imgElements) {
            const originalSrc = imgEl.getAttribute('src');
            if (!originalSrc || originalSrc.startsWith('http') || originalSrc.startsWith('app://')) {
                continue;
            }

            const decodedSrc = decodeURIComponent(originalSrc);
            
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(decodedSrc, activeFile.path);

            if (imageFile instanceof TFile) {
                const resourcePath = this.app.vault.adapter.getResourcePath(imageFile.path);
                imgEl.setAttribute('src', resourcePath);
                imgEl.setAttribute('data-src', imageFile.path); // Update data-src to the resolved vault path
            } else {
                console.warn(`MPEasy: Could not find local image file using getFirstLinkpathDest: ${decodedSrc}`);
                imgEl.classList.add('image-not-found');
                imgEl.setAttribute('title', `Image not found: ${decodedSrc}`);
            }
        }
    }

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
            const { html, plainText } = await processContent(this.contentDiv.innerHTML, {
                processImages: false
            });
            await copyHtml(html, plainText);
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
            const coverImageResult = getCoverImage(this.app, activeFile);
            let coverFile: TFile | null = null;

            if (coverImageResult === 'default_banner') {
                const defaultBannerPath = `${this.plugin.manifest.dir}/assets/images/banner.png`;
                const abstractFile = this.app.vault.getAbstractFileByPath(defaultBannerPath);
                if (abstractFile instanceof TFile) {
                    coverFile = abstractFile;
                } else {
                    alert('Default banner image not found! Looked at: ' + defaultBannerPath);
                }
            } else if (typeof coverImageResult === 'string') {
                // It's a web URL. WeChat requires uploading, so we can't use a URL directly.
                // For now, we will skip it. A future implementation could download it first.
                console.warn('MPEasy: Cover image is a web URL, which is not supported for direct upload to WeChat. Skipping cover image.');
            } else {
                coverFile = coverImageResult;
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

        // 2. 处理内容和图片
        const { html: processedHtml } = await processContent(this.contentDiv.innerHTML, {
            app: this.app,
            processImages: true,
            accessToken: currentToken
        });

        // 3. Send Draft
        try {
            const draftTitle = activeFile.basename;
            // 确保thumb_media_id是有效的，如果无效则不传递
            const options: any = {};
            if (thumb_media_id) {
                options.thumb_media_id = thumb_media_id;
            }
            
            const addDraftResponse = await addDraft(currentToken, draftTitle, processedHtml, options);
            alert(`草稿已成功发送！Media ID: ${addDraftResponse.media_id}`);
        } catch (error) {
            console.error("Error adding draft to WeChat:", error);
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
            
            // 处理本地图片路径
            this.processLocalImages(activeFile);
        } else {
            this.contentDiv.empty();
            this.contentDiv.createEl("p", { text: "No active Markdown file to preview." });
        }
    }
}