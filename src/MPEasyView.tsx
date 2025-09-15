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

/**
 * Fetches an image from a URL and returns it as a Blob.
 * @param url The URL of the image to fetch.
 * @returns A promise that resolves with the image Blob.
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
}


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
                processImages: false,
                plugin: this.plugin
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
            
            let imageBlob: Blob | null = null;
            let imageName: string = 'cover-image.png'; // Default name

            if (coverImageResult instanceof TFile) {
                const arrayBuffer = await this.app.vault.readBinary(coverImageResult);
                imageBlob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(coverImageResult.name) });
                imageName = coverImageResult.name;
            } else if (typeof coverImageResult === 'string' && coverImageResult.startsWith('http')) {
                try {
                    imageBlob = await fetchImageAsBlob(coverImageResult);
                    imageName = coverImageResult.substring(coverImageResult.lastIndexOf('/') + 1) || imageName;
                } catch (urlError) {
                    console.error('Failed to fetch cover image from URL:', urlError);
                    alert(`从URL加载封面图片失败: ${urlError.message}`);
                }
            } else if (coverImageResult === 'use_default_banner_setting') {
                const bannerFilename = this.plugin.settings.defaultCoverBanner;
                if (!bannerFilename) {
                    alert('未在插件设置中指定默认封面文件。');
                } else {
                    const defaultBannerPath = `${this.plugin.manifest.dir}/assets/images/${bannerFilename}`;
                    try {
                        // Use adapter.readBinary for files outside the vault's direct content (like plugin assets)
                        const arrayBuffer = await this.app.vault.adapter.readBinary(defaultBannerPath);
                        imageBlob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(bannerFilename) });
                        imageName = bannerFilename;
                    } catch (error) {
                        console.error(`MPEasy: Error reading default banner image: ${defaultBannerPath}`, error);
                        alert(`默认封面图片加载失败! 路径: ${defaultBannerPath}。错误: ${error.message}`);
                    }
                }
            } else if (coverImageResult === null) {
                // This means the user specified a cover in frontmatter, but it could not be found.
                alert('无法找到您在 frontmatter 中指定的封面图片，请检查 `cover` 字段的路径是否正确。');
                return; // Stop the process
            }

            if (imageBlob) {
                thumb_media_id = await uploadThumb(currentToken, imageBlob, imageName);
                console.log("Uploaded thumb image. Media ID:", thumb_media_id);
            }
        } catch (error) {
            console.error('Failed to upload thumb image:', error);
            alert(`上传封面图片失败: ${error.message}`);
            // Decide if you want to stop or continue without a cover
            // return; // Uncomment to stop if cover upload fails
        }


        // 2. 处理内容和图片
        const { html: processedHtml } = await processContent(this.contentDiv.innerHTML, {
            app: this.app,
            sourcePath: activeFile.path,
            processImages: true,
            accessToken: currentToken,
            plugin: this.plugin
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