import { App, TFile, Notice, requestUrl } from 'obsidian';
import type MPEasyPlugin from '../../main';
import { wxUploadImage } from '../sets/weixin-api';

// Function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function findFile(app: App, src: string): TFile | null {
    const allFiles = app.vault.getFiles();
    const decodedSrc = decodeURIComponent(src);
    // Find by exact match
    let file = allFiles.find(file => file.path === decodedSrc);
    if (file) return file;

    // Find by name match
    const fileName = decodedSrc.split('/').pop();
    if (fileName) {
        file = allFiles.find(file => file.name === fileName);
        if (file) return file;
    }

    return null;
}

export async function processLocalImages(html: string, plugin: MPEasyPlugin, forPreview: boolean): Promise<string> {
    console.log(`MPEasy: [processLocalImages] 开始处理本地图片，forPreview: ${forPreview}`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    const localImages = images.filter(img => 
        !img.src.startsWith('http://') && 
        !img.src.startsWith('https://') && 
        !img.src.startsWith('data:')
    );

    if (localImages.length === 0) {
        console.log('MPEasy: [processLocalImages] 未发现本地图片');
        return html;
    }
    console.log(`MPEasy: [processLocalImages] 发现 ${localImages.length} 张本地图片`);

    if (forPreview) {
        console.log('MPEasy: [processLocalImages] 为预览模式处理图片，转换为 Base64');
        
        // 并行处理所有图片
        const imagePromises = localImages.map(async (img) => {
            const src = img.getAttribute('src');
            if (!src) return;

            const file = findFile(plugin.app, src);
            if (!file) {
                img.alt = `图片加载失败: 找不到文件 ${src}`;
                console.warn(`MPEasy: [processLocalImages] 找不到文件: ${src}`);
                return;
            }

            try {
                const binary = await plugin.app.vault.readBinary(file);
                const base64 = arrayBufferToBase64(binary);
                img.src = `data:image/${file.extension};base64,${base64}`;
            } catch (error) {
                console.error(`MPEasy: [processLocalImages] 转换图片失败: ${file.name}`, error);
                img.alt = `图片转换失败: ${file.name}`;
            }
        });

        await Promise.all(imagePromises);
        
    } else {
        console.log('MPEasy: [processLocalImages] 为上传模式处理图片，上传到微信');
        new Notice(`发现 ${localImages.length} 张本地图片，正在并行上传...`);

        // 并行上传所有图片
        const uploadPromises = localImages.map(async (img, index) => {
            const src = img.getAttribute('src');
            if (!src) return null;

            const file = findFile(plugin.app, src);
            if (!file) {
                img.alt = `图片上传失败: 找不到文件 ${src}`;
                console.warn(`MPEasy: [processLocalImages] 找不到文件: ${src}`);
                return { img, success: false, error: '找不到文件' };
            }

            try {
                const binary = await plugin.app.vault.readBinary(file);
                const imageBlob = new Blob([binary], { type: `image/${file.extension}` });

                const uploadResult = await wxUploadImage(requestUrl, plugin, imageBlob, file.name);
                
                if (uploadResult && uploadResult.url) {
                    img.src = uploadResult.url;
                    img.dataset.src = uploadResult.url;
                    console.log(`MPEasy: [processLocalImages] 图片 ${file.name} 上传成功，URL: ${uploadResult.url}`);
                    return { img, success: true, url: uploadResult.url };
                } else {
                    throw new Error(uploadResult.errmsg || '未知错误');
                }
            } catch (e) {
                console.error(`MPEasy: [processLocalImages] 处理图片 ${file.name} 时出错:`, e);
                img.alt = `图片上传失败: ${e.message}`;
                return { img, success: false, error: e.message };
            }
        });

        const results = await Promise.allSettled(uploadPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failed = results.length - successful;

        if (failed > 0) {
            new Notice(`${successful} 张图片上传成功，${failed} 张失败`);
        } else {
            new Notice(`所有 ${successful} 张图片上传成功！`);
        }
        console.log(`MPEasy: [processLocalImages] 图片上传完成，成功: ${successful}, 失败: ${failed}`);
    }

    return doc.body.innerHTML;
}