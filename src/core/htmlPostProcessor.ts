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
        for (let i = 0; i < localImages.length; i++) {
            const img = localImages[i];
            const src = img.getAttribute('src');
            if (!src) continue;

            const file = findFile(plugin.app, src);
            if (!file) {
                img.alt = `图片加载失败: 找不到文件 ${src}`;
                console.warn(`MPEasy: [processLocalImages] 找不到文件: ${src}`);
                continue;
            }

            const binary = await plugin.app.vault.readBinary(file);
            const base64 = arrayBufferToBase64(binary);
            img.src = `data:image/${file.extension};base64,${base64}`;
        }
    } else {
        console.log('MPEasy: [processLocalImages] 为上传模式处理图片，上传到微信');
        new Notice(`发现 ${localImages.length} 张本地图片，正在上传...`);
        for (let i = 0; i < localImages.length; i++) {
            const img = localImages[i];
            const src = img.getAttribute('src');
            if (!src) continue;

            const file = findFile(plugin.app, src);
            if (!file) {
                new Notice(`图片上传失败：找不到文件 ${src}`);
                img.alt = `图片上传失败: 找不到文件 ${src}`;
                console.warn(`MPEasy: [processLocalImages] 找不到文件: ${src}`);
                continue;
            }

            new Notice(`正在上传图片 ${i + 1}/${localImages.length}: ${file.name}`);
            console.log(`MPEasy: [processLocalImages] 正在上传图片 ${i + 1}/${localImages.length}: ${file.name}`);

            try {
                const binary = await plugin.app.vault.readBinary(file);
                const imageBlob = new Blob([binary], { type: `image/${file.extension}` });

                const uploadResult = await wxUploadImage(requestUrl, plugin, imageBlob, file.name);
                console.log(`MPEasy: [processLocalImages] 图片 ${file.name} 上传结果:`, uploadResult);

                if (uploadResult && uploadResult.url) {
                    img.src = uploadResult.url;
                    img.dataset.src = uploadResult.url; // 添加 data-src 属性
                    new Notice(`图片 ${file.name} 上传成功！`);
                    console.log(`MPEasy: [processLocalImages] 图片 ${file.name} 上传成功，URL: ${uploadResult.url}`);
                } else {
                    throw new Error(uploadResult.errmsg || '未知错误');
                }
            } catch (e) {
                new Notice(`处理图片 ${src} 时出错: ${e.message}`);
                img.alt = `图片上传失败: ${e.message}`;
                console.error(`MPEasy: [processLocalImages] 处理图片 ${src} 时出错:`, e);
            }
        }
        new Notice('所有图片处理完毕！');
        console.log('MPEasy: [processLocalImages] 所有图片处理完毕');
    }

    return doc.body.innerHTML;
}