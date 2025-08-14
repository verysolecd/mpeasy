import {getBlobArrayBuffer, RequestUrlParam, Notice, requestUrl} from "obsidian";
import type { MPEasySettings } from "../settings";
import type MPEasyPlugin from "../../main";

async function ensureTokenValid(plugin: MPEasyPlugin): Promise<string> {
    console.log('MPEasy: [ensureTokenValid] 开始检查 Token');
    const { settings } = plugin;
    const token = settings.wxToken;
    const timestamp = settings.wxTokenTimestamp;
    const expiresIn = 7200 * 1000; // 2 hours in milliseconds
    const buffer = 5 * 60 * 1000; // 5 minutes buffer

    if (!token || !timestamp || (Date.now() - timestamp > expiresIn - buffer)) {
        console.log('MPEasy: [ensureTokenValid] Token 无效或已过期，正在刷新...');
        new Notice('Access token expired or invalid, refreshing...');
        const result = await wxGetToken(plugin.settings, requestUrl);

        if ("error" in result) {
            new Notice(result.error);
            console.error('MPEasy: [ensureTokenValid] 刷新 Token 失败:', result.error);
            throw new Error(result.error);
        }

        const newTokenData = await result.json;
        if (newTokenData && newTokenData.access_token) {
            plugin.settings.wxToken = newTokenData.access_token;
            plugin.settings.wxTokenTimestamp = Date.now();
            await plugin.saveSettings();
            new Notice('Access token refreshed successfully.');
            console.log('MPEasy: [ensureTokenValid] Token 刷新成功');
            return newTokenData.access_token;
        }
        else {
            const errorMsg = `Failed to refresh token: ${newTokenData.errmsg || 'Unknown error'}`;
            new Notice(errorMsg);
            console.error('MPEasy: [ensureTokenValid] 刷新 Token 失败:', newTokenData);
            throw new Error(errorMsg);
        }
    }
    console.log('MPEasy: [ensureTokenValid] Token 有效');
    return token;
}

// 获取token
export async function wxGetToken(settings: MPEasySettings, requestUrl: (options: RequestUrlParam) => Promise<any>) {
    console.log('MPEasy: [wxGetToken] 开始获取 Token');
    const appid = settings.wxAppId;
    const secret = settings.wxSecret;

    if (!appid || !secret) {
        console.error('MPEasy: [wxGetToken] AppID 或 Secret 未配置');
        return { error: '请先配置微信公众号的AppID和Secret' };
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    console.log(`MPEasy: [wxGetToken] 请求 URL: ${url}`);

    try {
        const res = await requestUrl({
            url,
            method: 'GET',
            throw: false
        });
        console.log('MPEasy: [wxGetToken] 收到响应:', res);
        
        if (res.status !== 200) {
            console.error(`MPEasy: [wxGetToken] HTTP 错误，状态码: ${res.status}`);
            return { error: `HTTP error! status: ${res.status}` };
        }

        const data = await res.json;
        if (data.errcode) {
            let errorMessage = `微信API错误: ${data.errcode} - ${data.errmsg}`;
            switch (data.errcode) {
                case 40001: errorMessage = 'AppSecret错误或不属于该公众号，请确认AppSecret的正确性'; break;
                case 40164: errorMessage = '调用接口的IP地址不在白名单中，请在微信公众平台接口IP白名单中进行设置'; break;
            }
            console.error(`MPEasy: [wxGetToken] 微信 API 错误:`, data);
            return { error: errorMessage, data };
        }
        
        console.log('MPEasy: [wxGetToken] 获取 Token 成功');
        return res;
    } catch (error) {
        console.error('MPEasy: [wxGetToken] 获取微信Token时发生未知错误:', error);
        return { error: '获取微信Token失败，请检查网络连接和AppID/Secret配置', details: error };
    }
}


// 上传图片
export async function wxUploadImage(requestUrl: (options: RequestUrlParam) => Promise<any>, plugin: MPEasyPlugin, data: Blob, filename: string, type?: string) {
    console.log(`MPEasy: [wxUploadImage] 开始上传图片: ${filename}, 类型: ${type || '默认'}`);
    try {
        const token = await ensureTokenValid(plugin);
        let url = '';
        if (type == null || type === '') {
            url = 'https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=' + token;
        } else {
            url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=${type}`
        }
        console.log(`MPEasy: [wxUploadImage] 请求 URL: ${url}`);

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
        console.log('MPEasy: [wxUploadImage] 请求选项:', options);

        const res = await requestUrl(options);
        console.log('MPEasy: [wxUploadImage] 收到响应:', res);

        if (res.status !== 200) {
            console.error(`MPEasy: [wxUploadImage] HTTP 错误，状态码: ${res.status}`);
            return { errmsg: `HTTP error! status: ${res.status}` };
        }

        const resData = await res.json;
        if (resData.errcode) {
            console.error(`MPEasy: [wxUploadImage] 微信 API 错误:`, resData);
            return { errmsg: `微信API错误: ${resData.errcode} - ${resData.errmsg}` };
        }

        return resData;
    } catch (e) {
        console.error('MPEasy: [wxUploadImage] 上传图片时发生未知错误:', e);
        return { errmsg: e.message };
    }
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

export async function wxAddDraft(requestUrl: (options: RequestUrlParam) => Promise<any>, plugin: MPEasyPlugin, data: DraftArticle) {
    console.log('MPEasy: [wxAddDraft] 开始新建草稿');
    try {
        const token = await ensureTokenValid(plugin);
		const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
        console.log(`MPEasy: [wxAddDraft] 请求 URL: ${url}`);
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
        console.log('MPEasy: [wxAddDraft] 请求体:', body);

		const res = await requestUrl({
			method: 'POST',
			url: url,
			throw: false,
			body: JSON.stringify(body)
		});
        console.log('MPEasy: [wxAddDraft] 收到响应:', res);

        if (res.status !== 200) {
            console.error(`MPEasy: [wxAddDraft] HTTP 错误，状态码: ${res.status}`);
            return { errmsg: `HTTP error! status: ${res.status}` };
        }

        const resData = await res.json;
        if (resData.errcode) {
            console.error(`MPEasy: [wxAddDraft] 微信 API 错误:`, resData);
            return { errmsg: `微信API错误: ${resData.errcode} - ${resData.errmsg}` };
        }

        return resData;
    } catch (e) {
        console.error('MPEasy: [wxAddDraft] 新建草稿时发生未知错误:', e);
        return { errmsg: e.message };
    }
}

export async function wxBatchGetMaterial(requestUrl: (options: RequestUrlParam) => Promise<any>, token: string, type: string, offset: number = 0, count: number = 10) {
    console.log(`MPEasy: [wxBatchGetMaterial] 开始获取素材列表: 类型=${type}, 偏移=${offset}, 数量=${count}`);
	const url = 'https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=' + token;
    console.log(`MPEasy: [wxBatchGetMaterial] 请求 URL: ${url}`);
	const body = {
		type,
		offset,
		count
	};
    console.log('MPEasy: [wxBatchGetMaterial] 请求体:', body);

	const res = await requestUrl({
		method: 'POST',
		url: url,
		throw: false,
		body: JSON.stringify(body)
	});
    console.log('MPEasy: [wxBatchGetMaterial] 收到响应:', res);

	return await res.json;
}