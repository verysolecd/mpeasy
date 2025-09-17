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

async function uploadMedia(url: string, imageBlob: Blob, filename: string): Promise<any> {
    const boundary = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`;
    const metadata = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: ${imageBlob.type}\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const metadataBuffer = new TextEncoder().encode(metadata);
    const imageBuffer = await imageBlob.arrayBuffer();
    const footerBuffer = new TextEncoder().encode(footer);

    const combinedBuffer = new Uint8Array(metadataBuffer.length + imageBuffer.byteLength + footerBuffer.length);
    combinedBuffer.set(metadataBuffer);
    combinedBuffer.set(new Uint8Array(imageBuffer), metadataBuffer.length);
    combinedBuffer.set(footerBuffer, metadataBuffer.length + imageBuffer.byteLength);

    const response = await requestUrl({
        url,
        method: 'POST',
        body: combinedBuffer.buffer,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
    });
    return response.json;
}

/**
 * Uploads an image for use within article content.
 * @returns A promise that resolves to the URL of the uploaded image.
 */
export async function uploadContentImage(accessToken: string, imageBlob: Blob, filename: string): Promise<string> {
    const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`;
    try {
        const data = await uploadMedia(url, imageBlob, filename);
        if (data && data.url) {
            return data.url;
        } else {
            throw new Error(`Failed to upload content image: ${data.errmsg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error uploading content image to WeChat:", error);
        throw error;
    }
}

/**
 * Uploads a thumbnail image for use as a cover.
 * @returns A promise that resolves to the media_id of the uploaded thumbnail.
 */
export async function uploadThumb(accessToken: string, imageBlob: Blob, filename: string): Promise<string> {
    const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=thumb`;
    try {
        const data = await uploadMedia(url, imageBlob, filename);
        if (data && data.media_id) {
            return data.media_id;
        } else {
            throw new Error(`Failed to upload thumb: ${data.errmsg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error uploading thumb to WeChat:", error);
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
 */
export async function addDraft(accessToken: string, title: string, content: string, options?: AddDraftOptions): Promise<AddDraftResponse> {
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;

    const body = {
        articles: [
            {
                title,
                content,
                ...options,
            }
        ]
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
