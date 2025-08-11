import { App, TFile, Notice } from 'obsidian';
import type MPEasyPlugin from '../../main';
import { wxUploadImage } from './wechatApi';

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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    const localImages = images.filter(img => 
        !img.src.startsWith('http://') && 
        !img.src.startsWith('https://') && 
        !img.src.startsWith('data:')
    );

    if (localImages.length === 0) {
        return html;
    }

    if (forPreview) {
        for (let i = 0; i < localImages.length; i++) {
            const img = localImages[i];
            const src = img.getAttribute('src');
            if (!src) continue;

            const file = findFile(plugin.app, src);
            if (!file) {
                img.alt = `图片加载失败: 找不到文件 ${src}`;
                continue;
            }

            const binary = await plugin.app.vault.readBinary(file);
            const base64 = arrayBufferToBase64(binary);
            img.src = `data:image/${file.extension};base64,${base64}`;
        }
    } else {
        new Notice(`发现 ${localImages.length} 张本地图片，正在上传...`);
        for (let i = 0; i < localImages.length; i++) {
            const img = localImages[i];
            const src = img.getAttribute('src');
            if (!src) continue;

            const file = findFile(plugin.app, src);
            if (!file) {
                new Notice(`图片上传失败：找不到文件 ${src}`);
                img.alt = `图片上传失败: 找不到文件 ${src}`;
                continue;
            }

            new Notice(`正在上传图片 ${i + 1}/${localImages.length}: ${file.name}`);

            try {
                const binary = await plugin.app.vault.readBinary(file);
                const imageBlob = new Blob([binary], { type: `image/${file.extension}` });

                const uploadResult = await wxUploadImage(plugin.settings, imageBlob, file.name);

                if (uploadResult && uploadResult.url) {
                    img.src = uploadResult.url;
                    img.dataset.src = uploadResult.url; // 添加 data-src 属性
                    new Notice(`图片 ${file.name} 上传成功！`);
                } else {
                    throw new Error(uploadResult.errmsg || '未知错误');
                }
            } catch (e) {
                new Notice(`处理图片 ${src} 时出错: ${e.message}`);
                img.alt = `图片上传失败: ${e.message}`;
            }
        }
        new Notice('所有图片处理完毕！');
    }

    return doc.body.innerHTML;
}