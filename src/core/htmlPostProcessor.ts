import { App, TFile, Notice } from 'obsidian';
import type MPEasyPlugin from '../../main';
import { wxUploadImage } from './wechatApi';

// 反向查找 TFile 从 app:// 链接
function findFileByResourcePath(app: App, resourcePath: string): TFile | null {
    const allFiles = app.vault.getFiles();
    for (const file of allFiles) {
        if (app.vault.getResourcePath(file) === resourcePath) {
            return file;
        }
    }
    return null;
}

export async function processLocalImages(html: string, plugin: MPEasyPlugin): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    const localImages = images.filter(img => img.src.startsWith('app://'));

    if (localImages.length === 0) {
        return html;
    }

    new Notice(`发现 ${localImages.length} 张本地图片，正在上传...`);

    for (let i = 0; i < localImages.length; i++) {
        const img = localImages[i];
        const localUrl = img.src;
        
        try {
            const file = findFileByResourcePath(plugin.app, localUrl);
            if (!file) {
                new Notice(`图片上传失败：找不到文件 ${localUrl}`);
                img.alt = `图片上传失败: 找不到文件 ${localUrl}`;
                continue;
            }

            new Notice(`正在上传图片 ${i + 1}/${localImages.length}: ${file.name}`);

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
            new Notice(`处理图片 ${localUrl} 时出错: ${e.message}`);
            img.alt = `图片上传失败: ${e.message}`;
        }
    }

    new Notice('所有图片处理完毕！');
    return doc.body.innerHTML;
}