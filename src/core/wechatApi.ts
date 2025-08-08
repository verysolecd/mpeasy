import { requestUrl } from "obsidian";
import type { MPEasySettings } from "../settings";

export async function wxGetToken(settings: MPEasySettings) {
    const { wxAppId, wxSecret } = settings;
    if (!wxAppId || !wxSecret) {
        throw new Error('请先配置微信公众号的AppID和Secret');
    }
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wxAppId}&secret=${wxSecret}`;
    const res = await requestUrl({ url, method: 'GET', throw: false });
    if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json;
}

export interface DraftArticle {
	title: string;
	content: string;
	thumb_media_id: string;
    author?: string;
	digest?: string;
	content_source_url?: string;
}

export async function wxAddDraft(settings: MPEasySettings, article: DraftArticle) {
    const token = settings.wxToken;
    if (!token) {
        throw new Error('请先获取 Access Token');
    }
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
    const body = { articles: [article] };
    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });
    if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json;
}

export async function wxUploadImage(settings: MPEasySettings, imageBlob: Blob, filename: string) {
    const token = settings.wxToken;
    if (!token) {
        throw new Error('请先获取 Access Token');
    }
    const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;

    const N = 16;
    const randomBoundryString = "djmangoBoundry" + Array(N + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, N);

    const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: "${imageBlob.type}"\r\n\r\n`;
    const post_string = `\r\n------${randomBoundryString}--`;

    const pre_string_encoded = new TextEncoder().encode(pre_string);
    const post_string_encoded = new TextEncoder().encode(post_string);
    const concatenated = await new Blob([pre_string_encoded, imageBlob, post_string_encoded]).arrayBuffer();

    const res = await requestUrl({
        method: 'POST',
        url: url,
        contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
        body: concatenated,
        throw: false,
    });

    if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json;
}