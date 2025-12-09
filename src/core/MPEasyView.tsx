import { ItemView, WorkspaceLeaf, App, TFile, Notice } from 'obsidian';
import { initRenderer } from '../rendering/renderer/renderer/renderer-impl';
import { themeMap } from '../utils/config/configs/theme';
import { renderMarkdown, postProcessHtml } from '../rendering/renderer/utils/markdownHelpers';
import { copyHtml } from '../utils/clipboard';
import MPEasyPlugin from '../main';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import { StyleSettings } from '../utils/config/types/settings';
import { getAccessToken, uploadThumb, addDraft, AddDraftOptions } from '../utils/wechat/api';
import { getMimeTypeFromFilename } from '../utils/config/utils/fileHelpers';
import { getFrontmatterData } from '../content/frontmatter';
import { processContent } from '../content/processor';
import { WECHAT_CONFIG } from '../utils/config/constants';

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

/**
 * Gets the dimensions of an image from a Blob.
 * @param blob The image blob.
 * @returns A promise that resolves with the width and height of the image.
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });
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
        
        // 添加分隔线
        const dividerDiv = renderAreaDiv.createDiv({ cls: "mpeasy-header-divider" });
        dividerDiv.createDiv({ cls: "divider-dot" }); // 添加中心点

        this.contentDiv = renderAreaDiv.createDiv({ id: "mpeasy-rendered-content" });
        this.contentDiv.style.padding = "1em";
        this.contentDiv.style.overflowY = "auto";

        this.codeThemeStyleEl = renderAreaDiv.createEl('style', { attr: { id: 'mpeasy-code-theme-style' } });
        this.customCSSStyleEl = renderAreaDiv.createEl('style', { attr: { id: 'mpeasy-custom-css-style' } });

        const sidePanelContainer = container.createDiv({ cls: "mpeasy-side-panel" });

        // Create Toggle Button
        const toggleButton = container.createDiv({ cls: 'mpeasy-side-panel-toggle-button' });
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left">
                <path d="m15 18-6-6 6-6" />
            </svg>
        `;

        // Add event listener to the toggle button
        let isSidePanelCollapsed = false;
        toggleButton.addEventListener('click', () => {
            isSidePanelCollapsed = !isSidePanelCollapsed;
            sidePanelContainer.toggleClass('collapsed', isSidePanelCollapsed);
            toggleButton.toggleClass('collapsed', isSidePanelCollapsed);
        });

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
                onCopyHTML={this.copyRenderedHtml}
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

    private async getValidAccessToken(): Promise<string | null> {
        const { wxId, wxSecret, wxToken, wxTokenAcquisitionTime } = this.plugin.settings;
        const TOKEN_EXPIRATION_SECONDS = WECHAT_CONFIG.TOKEN_EXPIRATION_SECONDS;

        if (!wxId || !wxSecret) {
            alert("请在插件设置中配置公众号ID和Secret。");
            return null;
        }

        if (!wxToken || !wxTokenAcquisitionTime || (Date.now() - wxTokenAcquisitionTime) / 1000 > TOKEN_EXPIRATION_SECONDS) {
            try {
                const newAccessToken = await getAccessToken(wxId, wxSecret);
                this.plugin.settings.wxToken = newAccessToken;
                this.plugin.settings.wxTokenAcquisitionTime = Date.now();
                await this.plugin.saveSettings();
                new Notice("微信公众号Access Token已更新");
                return newAccessToken;
            } catch (error) {
                new Notice(`无法获取Access Token: ${error.message}`);
                return null;
            }
        }

        return wxToken;
    }

    async copyRenderedHtml(processImages: boolean): Promise<boolean> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            alert("No active file.");
            return false;
        }

        let currentToken: string | null = null;
        if (processImages) {
            currentToken = await this.getValidAccessToken();
            if (!currentToken) {
                return false;
            }
        }

        try {
            const { html, plainText } = await processContent(this.contentDiv.innerHTML, {
                app: this.app,
                sourcePath: activeFile.path,
                processImages: processImages,
                accessToken: currentToken,
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
        const currentToken = await this.getValidAccessToken();
        if (!currentToken) {
            return;
        }

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            alert("No active file.");
            return;
        }

        // Use Obsidian's metadata cache to get frontmatter efficiently
        const fileCache = this.app.metadataCache.getFileCache(activeFile);
        const frontmatter = fileCache?.frontmatter || {};

        const draftTitle = activeFile.basename;
        const options: AddDraftOptions = { need_open_comment: 1, only_fans_can_comment: 0 };

        // Use the frontmatter object from the cache
        if (frontmatter.author) {
            options.author = frontmatter.author;
        }
        if (frontmatter.digest) {
            options.digest = frontmatter.digest;
        }

        // 1. Handle Cover Image
        try {
            const { coverImage: coverImageResult } = getFrontmatterData(this.app, activeFile);
            
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
                    // No default banner set, proceed without a cover
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
                // Only apply custom crop if cover is from frontmatter
                const isFrontmatterCover = !!frontmatter?.cover;

                if (isFrontmatterCover) {
                    try {
                        const { width, height } = await getImageDimensions(imageBlob);
                        if (width > height) { // Only crop landscape images
                            const x2 = (height / width).toFixed(6); // Use up to 6 decimal places as per docs
                            options.pic_crop_1_1 = `0_0_${x2}_1`;
                            console.log(`MPEasy: Applying 1:1 left-crop with normalized coordinates: ${options.pic_crop_1_1}`);
                        }
                    } catch (dimError) {
                        console.error("MPEasy: Could not get image dimensions for cropping.", dimError);
                        // Fail silently and proceed without custom crop
                    }
                }

                const thumb_media_id = await uploadThumb(currentToken, imageBlob, imageName);
                options.thumb_media_id = thumb_media_id;
                console.log("Uploaded thumb image. Media ID:", thumb_media_id);
            }
        } catch (error) {
            console.error('Failed to prepare or upload cover image:', error);
            alert(`封面图片处理或上传失败: ${error.message}`);
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
            
            // 更新标题为当前文档标题
            const headerElement = this.containerEl.querySelector('.mpeasy-header h2');
            if (headerElement) {
                headerElement.textContent = activeFile.basename;
            }
            
            // 处理本地图片路径
            this.processLocalImages(activeFile);
        } else {
            this.contentDiv.empty();
            this.contentDiv.createEl("p", { text: "No active Markdown file to preview." });
            
            // 没有活动文件时恢复默认标题
            const headerElement = this.containerEl.querySelector('.mpeasy-header h2');
            if (headerElement) {
                headerElement.textContent = "MPEasy Preview";
            }
        }
    }
}
