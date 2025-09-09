import { requestUrl } from 'obsidian';

// WeChat API logic will go here.

/**
 * Fetches the access token from the WeChat API.
 * @param appId The AppID of your WeChat Official Account.
 * @param appSecret The AppSecret of your WeChat Official Account.
 * @returns A promise that resolves to the access token.
 */
export async function getAccessToken(appId: string, appSecret: string): Promise<string> {
    if (!appId || !appSecret) {
        throw new Error('AppID or AppSecret is not configured.');
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    
    try {
        const response = await requestUrl({ url });
        const data = response.json;

        if (data && data.access_token) {
            return data.access_token;
        } else {
            throw new Error(`Failed to get access token: ${data.errmsg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error fetching WeChat access token:", error);
        throw error;
    }
}

/**
 * Uploads an image to WeChat material library.
 * @param accessToken The WeChat access token.
 * @param imageBlob The image data as a Blob.
 * @param filename The name of the image file.
 * @returns A promise that resolves to the URL of the uploaded image.
 */
export async function uploadImage(accessToken: string, imageBlob: Blob, filename: string): Promise<string> {
    const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`;

    const formData = new FormData();
    formData.append('media', imageBlob, filename);

    try {
        const response = await requestUrl({
            url,
            method: 'POST',
            body: formData,
            headers: {
                // 'Content-Type': 'multipart/form-data', // requestUrl handles this automatically with FormData
            },
        });
        const data = response.json;

        if (data && data.url) {
            return data.url;
        } else {
            throw new Error(`Failed to upload image: ${data.errmsg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error uploading image to WeChat:", error);
        throw error;
    }
}

export interface AddDraftOptions {
    author?: string;
    digest?: string;
    thumb_media_id?: string; // media_id of the cover image
    need_open_comment?: number; // 1 for open, 0 for close
    only_fans_can_comment?: number; // 1 for true, 0 for false
}

export interface AddDraftResponse {
    media_id: string;
}

/**
 * Adds a new draft to WeChat Official Account.
 * @param accessToken The WeChat access token.
 * @param title The title of the draft.
 * @param content The HTML content of the draft.
 * @param options Optional parameters for the draft.
 * @returns A promise that resolves to the media_id of the new draft.
 */
export async function addDraft(accessToken: string, title: string, content: string, options?: AddDraftOptions): Promise<AddDraftResponse> {
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;

    const body = {
        title,
        content,
        ...options,
    };

    try {
        const response = await requestUrl({
            url,
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = response.json;

        if (data && data.media_id) {
            return data;
        } else {
            throw new Error(`Failed to add draft: ${data.errmsg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error adding draft to WeChat:", error);
        throw error;
    }
}
