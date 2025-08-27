import { requestUrl, App } from 'obsidian';
import type MPEasyPlugin from '../../main';

export async function wxUploadImage(requestUrlFunc: typeof requestUrl, plugin: MPEasyPlugin, blob: Blob, filename: string, type?: string): Promise<any> {
    // Placeholder implementation
    return Promise.resolve({ url: 'https://via.placeholder.com/150' });
}

export async function wxAddDraft(requestUrlFunc: typeof requestUrl, plugin: MPEasyPlugin, draft: any): Promise<any> {
    // Placeholder implementation
    return Promise.resolve({ media_id: 'placeholder_media_id' });
}
