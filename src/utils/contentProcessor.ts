import { App, TFile } from 'obsidian';
import { getMimeTypeFromFilename } from '../shared/utils/fileHelpers';
import { uploadContentImage } from '../wx/api';
import { resolveImagePath } from './imagePathResolver';

// Options for processing content
interface ProcessOptions {
    app?: App;
    sourcePath?: string;
    processImages?: boolean;
    accessToken?: string;
}

/**
 * Processes all images within the HTML document.
 * It finds local images, uploads them to WeChat, and replaces the src attribute.
 * @param doc The HTML document to process.
 * @param options The processing options.
 */
async function processHtmlImages(doc: Document, options: ProcessOptions): Promise<void> {
    const { app, sourcePath, accessToken } = options;

    if (!app || !sourcePath || !accessToken) {
        return;
    }

    const imgElements = Array.from(doc.querySelectorAll('img'));

    for (const imgEl of imgElements) {
        const src = imgEl.getAttribute('src');
        const dataSrc = imgEl.getAttribute('data-src') || src;

        if (!dataSrc || dataSrc.startsWith('http')) continue;

        try {
            let blob: Blob;
            let filename: string;

            if (dataSrc.startsWith('data:image/')) {
                blob = dataURItoBlob(dataSrc);
                filename = `image_${Date.now()}.png`;
            } else {
                const imageFile = resolveImagePath(app, dataSrc, sourcePath);
                if (imageFile instanceof TFile) {
                    const arrayBuffer = await app.vault.readBinary(imageFile);
                    blob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(imageFile.name) });
                    filename = imageFile.name;
                } else {
                    console.warn(`Could not find local image file: ${dataSrc}`);
                    continue;
                }
            }

            const uploadedUrl = await uploadContentImage(accessToken, blob, filename);
            imgEl.setAttribute('src', uploadedUrl);
            console.log('Uploaded content image. New URL:', uploadedUrl);
        } catch (error) {
            console.error(`Failed to upload content image: ${dataSrc}`, error);
        }
    }
}


/**
 * 将Data URI转换为Blob对象
 */
export function dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

export interface ProcessedContent {
    html: string;
    plainText: string;
}

/**
 * 统一处理HTML内容，用于复制和发送草稿
 * @param html 原始HTML内容
 * @param options 处理选项
 * @returns 处理后的内容
 */
export async function processContent(
    html: string, 
    options: ProcessOptions
): Promise<ProcessedContent> {
    const { processImages } = options;
    
    // 创建DOM文档
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 1. 处理图片 (如果需要)
    if (processImages) {
        await processHtmlImages(doc, options);
    }
    
    // 2. 添加格式保护处理
    const protectFormatting = (htmlContent: string): string => {
        // 保护关键的内联样式
        let protectedContent = htmlContent;
        
        // 确保特定标签和属性不被过滤
        protectedContent = protectedContent.replace(/<([a-z][a-z0-9]*)(\s[^>]*?)?(\sstyle="[^"]*")?([^>]*?)>/gi, 
            (match, tag, attrs1, styleAttr, attrs2) => {
                if (styleAttr) {
                    return `<${tag}${attrs1 || ''}${styleAttr}${attrs2 || ''}>`;                
                }
                return match;
            });
        
        // 确保图片标签格式正确，微信要求图片必须有data-src属性
        protectedContent = protectedContent.replace(/<img([^>]*)src="([^"]*)"([^>]*)>/gi, 
            (match, before, src, after) => {
                if (match.indexOf('data-src') === -1) {
                    return `<img${before}src="${src}" data-src="${src}"${after}>`;
                }
                return match;
            });
            
        return protectedContent;
    };
    
    // 3. 微信公众号编辑器特殊处理
    const processForWechat = (htmlContent: string): string => {
        let processed = htmlContent;
        
        // 处理代码块
        processed = processed.replace(/<pre([^>]*)><code([^>]*)>(.*?)<\/code><\/pre>/gis, (match, preAttrs, codeAttrs, content) => {
            const langMatch = codeAttrs.match(/class="language-([^"]*)"/i);
            const lang = langMatch ? langMatch[1] : '';
            return `<pre class="code-snippet__js" data-lang="${lang}">${content}</pre>`;
        });
        
        // 处理表格
        processed = processed.replace(/<table([^>]*)>/gi, '<table class="custom-table"$1>');
        
        // 处理引用块
        processed = processed.replace(/<blockquote([^>]*)>/gi, '<blockquote class="custom-quote"$1>');
        
        return processed;
    };
    
    // 4. 生成最终HTML
    let processedHtml = protectFormatting(doc.body.innerHTML);
    if (processImages) {
        processedHtml = processForWechat(processedHtml);
    }
    
    // 5. 生成纯文本版本（用于剪贴板）
    const plainText = processedHtml.replace(/<[^>]+>/g, '');
    
    return {
        html: processedHtml,
        plainText
    };
}
