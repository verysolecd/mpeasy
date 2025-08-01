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
    let processedHtml = html;
    const imageRegex = /<img src="(app:\/\/[^\/"]+\/[^"\?]+)"/g;
    const matches = [...html.matchAll(imageRegex)];

    if (matches.length === 0) {
        return html;
    }

    new Notice(`发现 ${matches.length} 张本地图片，正在上传...`);

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const localUrl = match[1];
        
        try {
            const file = findFileByResourcePath(plugin.app, localUrl);
            if (!file) {
                new Notice(`图片上传失败：找不到文件 ${localUrl}`);
                continue;
            }

            new Notice(`正在上传图片 ${i + 1}/${matches.length}: ${file.name}`);

            const binary = await plugin.app.vault.readBinary(file);
            const imageBlob = new Blob([binary], { type: `image/${file.extension}` });

            const uploadResult = await wxUploadImage(plugin.settings, imageBlob, file.name);

            if (uploadResult && uploadResult.url) {
                processedHtml = processedHtml.replace(localUrl, uploadResult.url);
                new Notice(`图片 ${file.name} 上传成功！`);
            } else {
                throw new Error(uploadResult.errmsg || '未知错误');
            }
        } catch (e) {
            new Notice(`处理图片 ${localUrl} 时出错: ${e.message}`);
            // 如果一张图片失败，我们选择继续处理下一张，而不是中断整个流程
        }
    }

    new Notice('所有图片处理完毕！');
    return processedHtml;
}