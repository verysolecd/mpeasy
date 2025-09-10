import { TFile } from 'obsidian';
import { getMimeTypeFromFilename } from '../shared/utils/fileHelpers';
import { uploadContentImage } from '../wx/api';
import { resolveObsidianPath } from './imagePathResolver';

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
    options: {
        app?: any;
        processImages?: boolean;
        accessToken?: string;
    }
): Promise<ProcessedContent> {
    const { app, processImages, accessToken } = options;
    
    // 创建DOM文档
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 处理图片
    if (processImages && app && accessToken) {
        const imgElements = Array.from(doc.querySelectorAll('img'));
        
        for (const imgEl of imgElements) {
            const src = imgEl.getAttribute('src');
            const dataSrc = imgEl.getAttribute('data-src') || src;
            if (!src || src.startsWith('http')) continue;
            
            try {
                let blob: Blob;
                let filename: string;
                
                if (src.startsWith('data:image/')) {
                    blob = dataURItoBlob(src);
                    filename = `image_${Date.now()}.png`;
                } else {
                    const imageFile = resolveObsidianPath(app, dataSrc || src);

                    if (imageFile instanceof TFile) {
                        const arrayBuffer = await app.vault.readBinary(imageFile);
                        blob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(imageFile.name) });
                        filename = imageFile.name;
                    } else {
                        console.warn(`Could not find local image file: ${src}`);
                        continue;
                    }
                }
                
                const uploadedUrl = await uploadContentImage(accessToken, blob, filename);
                imgEl.setAttribute('src', uploadedUrl);
                console.log('Uploaded content image. New URL:', uploadedUrl);
            } catch (error) {
                console.error(`Failed to upload content image: ${src}`, error);
            }
        }
    }
    
    // 添加格式保护处理
    const protectFormatting = (htmlContent: string): string => {
        // 保护关键的内联样式
        let protected = htmlContent;
        
        // 确保特定标签和属性不被过滤
        // 例如，为了保护某些样式，可以添加微信支持的属性
        protected = protected.replace(/<([a-z][a-z0-9]*)(\s[^>]*?)?(\sstyle="[^"]*")?([^>]*?)>/gi, 
            (match, tag, attrs1, styleAttr, attrs2) => {
                // 如果有style属性，确保它被保留
                if (styleAttr) {
                    return `<${tag}${attrs1 || ''}${styleAttr}${attrs2 || ''}>`;                
                }
                return match;
            });
        
        // 确保图片标签格式正确，微信要求图片必须有data-src属性
        protected = protected.replace(/<img([^>]*)src="([^"]*)"([^>]*)>/gi, 
            (match, before, src, after) => {
                // 检查是否已经有data-src属性
                if (match.indexOf('data-src') === -1) {
                    return `<img${before}src="${src}" data-src="${src}"${after}>`;
                }
                return match;
            });
            
        return protected;
    };
    
    // 微信公众号编辑器特殊处理
    const processForWechat = (htmlContent: string): string => {
        let processed = htmlContent;
        
        // 处理代码块，确保使用微信支持的格式
        processed = processed.replace(/<pre([^>]*)><code([^>]*)>(.*?)<\/code><\/pre>/gis, (match, preAttrs, codeAttrs, content) => {
            // 提取语言信息
            const langMatch = codeAttrs.match(/class="language-([^"]*)"/i);
            const lang = langMatch ? langMatch[1] : '';
            
            // 微信支持的代码块格式
            return `<pre class="code-snippet__js" data-lang="${lang}">${content}</pre>`;
        });
        
        // 处理表格，确保使用微信支持的格式
        processed = processed.replace(/<table([^>]*)>/gi, '<table class="custom-table"$1>');
        
        // 处理引用块，确保使用微信支持的格式
        processed = processed.replace(/<blockquote([^>]*)>/gi, '<blockquote class="custom-quote"$1>');
        
        return processed;
    };
    
    // 获取处理后的HTML
    let processedHtml = protectFormatting(doc.body.innerHTML);
    
    // 如果是为微信处理，添加额外的格式处理
    if (processImages) {
        processedHtml = processForWechat(processedHtml);
    }
    
    // 生成纯文本版本（用于剪贴板）
    const plainText = processedHtml.replace(/<[^>]+>/g, '');
    
    return {
        html: processedHtml,
        plainText
    };
}