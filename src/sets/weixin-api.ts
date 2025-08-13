import {getBlobArrayBuffer, requestUrl, RequestUrlParam, Notice} from "obsidian";
import type { MPEasySettings } from "../settings";
import type MPEasyPlugin from "../../main";

async function ensureTokenValid(plugin: MPEasyPlugin): Promise<string> {
    const { settings } = plugin;
    const token = settings.wxToken;
    const timestamp = settings.wxTokenTimestamp;
    const expiresIn = 7200 * 1000; // 2 hours in milliseconds
    const buffer = 5 * 60 * 1000; // 5 minutes buffer

    if (!token || !timestamp || (Date.now() - timestamp > expiresIn - buffer)) {
        new Notice('Access token expired or invalid, refreshing...');
        const result = await wxGetToken(plugin.settings);

        if ("error" in result) {
            new Notice(result.error);
            throw new Error(result.error);
        }

        const newTokenData = await result.json;
        if (newTokenData && newTokenData.access_token) {
            plugin.settings.wxToken = newTokenData.access_token;
            plugin.settings.wxTokenTimestamp = Date.now();
            await plugin.saveSettings();
            new Notice('Access token refreshed successfully.');
            return newTokenData.access_token;
        } else {
            const errorMsg = `Failed to refresh token: ${newTokenData.errmsg || 'Unknown error'}`;
            new Notice(errorMsg);
            throw new Error(errorMsg);
        }
    }
    return token;
}

// 获取token
export async function wxGetToken(settings: MPEasySettings) {
    const appid = settings.wxAppId;
    const secret = settings.wxSecret;

    if (!appid || !secret) {
        return { error: '请先配置微信公众号的AppID和Secret' };
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;

    try {
        const res = await requestUrl({
            url,
            method: 'GET',
            throw: false
        });
        
        if (res.status !== 200) {
            return { error: `HTTP error! status: ${res.status}` };
        }

        const data = await res.json;
        if (data.errcode) {
            let errorMessage = `微信API错误: ${data.errcode} - ${data.errmsg}`;
            switch (data.errcode) {
                case 40001: errorMessage = 'AppSecret错误或不属于该公众号，请确认AppSecret的正确性'; break;
                case 40164: errorMessage = '调用接口的IP地址不在白名单中，请在微信公众平台接口IP白名单中进行设置'; break;
            }
            return { error: errorMessage, data };
        }
        
        return res;
    } catch (error) {
        return { error: '获取微信Token失败，请检查网络连接和AppID/Secret配置', details: error };
    }
}


// 上传图片
export async function wxUploadImage(plugin: MPEasyPlugin, data: Blob, filename: string, type?: string) {
	const token = await ensureTokenValid(plugin);
	let url = '';
	if (type == null || type === '') {
		url = 'https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=' + token;
	} else {
		url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=${type}`
	}

	const N = 16
	const randomBoundryString = "djmangoBoundry" + Array(N + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, N)

	const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
	const post_string = `\r\n------${randomBoundryString}--`

	const pre_string_encoded = new TextEncoder().encode(pre_string);
	const post_string_encoded = new TextEncoder().encode(post_string);
	const concatenated = await new Blob([pre_string_encoded, await getBlobArrayBuffer(data), post_string_encoded]).arrayBuffer()

	const options: RequestUrlParam = {
		method: 'POST',
		url: url,
		contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
		body: concatenated
	};

	const res = await requestUrl(options);
	return await res.json;
}

// 新建草稿
export interface DraftArticle {
	title: string;
	author?: string;
	digest?: string;
	cover?: string;
	content: string;
	content_source_url?: string;
	thumb_media_id: string;
	need_open_comment?: number;
	only_fans_can_comment?: number;
	pic_crop_235_1?: string;
	pic_crop_1_1?: string;
}

export async function wxAddDraft(plugin: MPEasyPlugin, data: DraftArticle) {
    const token = await ensureTokenValid(plugin);
	const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
	const body = {
		articles: [{
			title: data.title,
			content: data.content,
			digest: data.digest,
			thumb_media_id: data.thumb_media_id,
			...data.pic_crop_235_1 && {pic_crop_235_1: data.pic_crop_235_1},
			...data.pic_crop_1_1 && {pic_crop_1_1: data.pic_crop_1_1},
			...data.content_source_url && {content_source_url: data.content_source_url},
			...data.need_open_comment !== undefined && {need_open_comment: data.need_open_comment},
			...data.only_fans_can_comment !== undefined && {only_fans_can_comment: data.only_fans_can_comment},
			...data.author && {author: data.author},
		}]
	};

	const res = await requestUrl({
		method: 'POST',
		url: url,
		throw: false,
		body: JSON.stringify(body)
	});

	return res.json;
}

export async function wxBatchGetMaterial(token: string, type: string, offset: number = 0, count: number = 10) {
	const url = 'https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=' + token;
	const body = {
		type,
		offset,
		count
	};

	const res = await requestUrl({
		method: 'POST',
		url: url,
		throw: false,
		body: JSON.stringify(body)
	});

	return await res.json;
}