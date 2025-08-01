import {MarkedExtension, Token, Tokens} from "marked";
import {MarkdownView, requestUrl, TAbstractFile, TFile} from "obsidian";
import {NMPSettings} from "../settings";
import {Extension} from "./extension";

declare module 'obsidian' {
	interface Vault {
		config: {
			attachmentFolderPath: string;
			newLinkFormat: string;
			useMarkdownLinks: boolean;
		};
	}
}

const LocalFileRegex = /^!\[\[(.*?)\]\]/;

interface ImageInfo {
	resUrl: string;
	filePath: string;
	url: string | null;
}

export class LocalImageManager {
	private images: Map<string, ImageInfo>;
	private static instance: LocalImageManager;

	private constructor() {
		this.images = new Map<string, ImageInfo>();
	}

	// 静态方法，用于获取实例
	public static getInstance(): LocalImageManager {
		if (!LocalImageManager.instance) {
			LocalImageManager.instance = new LocalImageManager();
		}
		return LocalImageManager.instance;
	}

	public setImage(path: string, info: ImageInfo): void {
		if (!this.images.has(path)) {
			this.images.set(path, info);
		}
	}

	public getImage(path: string): ImageInfo | undefined {
		return this.images.get(path);
	}

	replaceImages(root: HTMLElement) {
		const images = root.getElementsByTagName('img');
		const keys = this.images.keys();
		for (let key of keys) {
			const value = this.images.get(key);
			if (value == null) continue;
			if (value.url == null) continue;
			for (let i = 0; i < images.length; i++) {
				const img = images[i];
				if (img.src.startsWith('http')) {
					continue;
				}
				if (img.src === key) {
					img.setAttribute('src', value.url);
					break;
				}
			}
		}
	}

	async cleanup() {
		this.images.clear();
	}
}


export class LocalFile extends Extension {
	index: number = 0;

	getName(): string {
		return "LocalFile";
	}

	generateId() {
		this.index += 1;
		return `fid-${this.index}`;
	}

	getImagePath(path: string) {
		const file = this.assetsManager.searchFile(path);

		if (file == null) {
			console.error('找不到文件：' + path);
			return '';
		}

		const resPath = this.app.vault.getResourcePath(file as TFile);
		const info = {
			resUrl: resPath,
			filePath: file.path,
			url: null
		};
		LocalImageManager.getInstance().setImage(resPath, info);
		return resPath;
	}

	isImage(file: string) {
		file = file.toLowerCase();
		return file.endsWith('.png')
			|| file.endsWith('.jpg')
			|| file.endsWith('.jpeg')
			|| file.endsWith('.gif')
			|| file.endsWith('.bmp')
			|| file.endsWith('.webp');
	}

	parseImageLink(link: string) {
		if (link.includes('|')) {
			const parts = link.split('|');
			const path = parts[0];
			if (!this.isImage(path)) return null;

			let width = null;
			let height = null;
			if (parts.length == 2) {
				const size = parts[1].toLowerCase().split('x');
				width = parseInt(size[0]);
				if (size.length == 2 && size[1] != '') {
					height = parseInt(size[1]);
				}
			}
			return {path, width, height};
		}
		if (this.isImage(link)) {
			return {path: link, width: null, height: null};
		}
		return null;
	}

	getHeaderLevel(line: string) {
		const match = line.trimStart().match(/^#{1,6}/);
		if (match) {
			return match[0].length;
		}
		return 0;
	}

	async getFileContent(file: TAbstractFile, header: string | null, block: string | null) {
		const content = await this.app.vault.adapter.read(file.path);
		if (header == null && block == null) {
			return content;
		}

		let result = '';
		const lines = content.split('\n');
		if (header) {
			let level = 0;
			let append = false;
			for (let line of lines) {
				if (append) {
					if (level == this.getHeaderLevel(line)) {
						break;
					}
					result += line + '\n';
					continue;
				}
				if (!line.trim().startsWith('#')) continue;
				const items = line.trim().split(' ');
				if (items.length != 2) continue;
				if (header.trim() != items[1].trim()) continue;
				if (this.getHeaderLevel(line)) {
					result += line + '\n';
					level = this.getHeaderLevel(line);
					append = true;
				}
			}
		}

		if (block) {
			let preline = '';
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line.indexOf(block) >= 0) {
					result = line.replace(block, '');
					if (result.trim() == '') {
						for (let j = i - 1; j >= 0; j--) {
							const l = lines[j];
							if (l.trim() != '') {
								result = l;
								break;
							}
						}
					}
					break;
				}
				preline = line;
			}
		}

		return result;
	}

	parseFileLink(link: string) {
		const info = link.split('|')[0];
		const items = info.split('#');
		let path = items[0];
		let header = null;
		let block = null;
		if (items.length == 2) {
			if (items[1].startsWith('^')) {
				block = items[1];
			} else {
				header = items[1];
			}
		}
		return {path, head: header, block};
	}

	async renderFile(link: string, id: string) {
		let {path, head: header, block} = this.parseFileLink(link);
		let file = null;
		if (path === '') {
			file = this.app.workspace.getActiveFile();
		} else {
			if (!path.endsWith('.md')) {
				path = path + '.md';
			}
			file = this.assetsManager.searchFile(path);
		}

		if (file == null) {
			const msg = '找不到文件：' + path;
			console.error(msg)
			this.callback.updateElementByID(id, msg);
			return;
		}

		const content = await this.getFileContent(file, header, block);
		const body = await this.marked.parse(content);
		this.callback.updateElementByID(id, body);
	}

	async readBlob(src: string) {
		return await fetch(src).then(response => response.blob())
	}

	async getExcalidrawUrl(data: string) {
		const url = 'https://obplugin.sunboshi.tech/math/excalidraw';
		const req = await requestUrl({
			url,
			method: 'POST',
			contentType: 'application/json',
			headers: {
				authkey: NMPSettings.getInstance().authKey
			},
			body: JSON.stringify({data})
		});

		if (req.status != 200) {
			console.error(req.status);
			return null;
		}
		return req.json.url;
	}

	parseExcalidrawLink(link: string) {
		let file = '';
		let style = 'style="width:100%;height:100%"';
		let classname = 'note-embed-excalidraw-left';
		const postions = new Map<string, string>([
			['left', 'note-embed-excalidraw-left'],
			['center', 'note-embed-excalidraw-center'],
			['right', 'note-embed-excalidraw-right']
		])
		if (link.includes('|')) {
			const items = link.split('|');
			file = items[0];
			let size = '';
			if (items.length == 2) {
				if (postions.has(items[1])) {
					classname = items[1];
				} else {
					size = items[1];
				}
			} else if (items.length == 3) {
				size = items[1];
				classname = postions.get(items[2]) || classname;
			}
			if (size != '') {
				const sizes = size.split('x');
				if (sizes.length == 2) {
					style = `style="width:${sizes[0]}px;height:${sizes[1]}px;"`
				} else {
					style = `style="width:${sizes[0]}px;"`
				}
			}
		} else {
			file = link;
		}

		if (file.endsWith('excalidraw') || file.endsWith('excalidraw.md')) {
			return {file, style, classname};
		}

		return null;
	}

	async renderExcalidraw(name: string, id: string) {
		try {
			let container: HTMLElement | null = null;
			const currentFile = this.app.workspace.getActiveFile();
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			for (let leaf of leaves) {
				const markdownView = leaf.view as MarkdownView;
				if (markdownView.file?.path === currentFile?.path) {
					container = markdownView.containerEl;
				}
			}
			if (container) {
				const containers = container.querySelectorAll('.internal-embed');
				for (let container of containers) {
					if (name !== container.getAttribute('src')) {
						continue;
					}

					const src = await this.getExcalidrawUrl(container.innerHTML);
					let svg = '';
					if (src === '') {
						svg = '渲染失败';
						console.log('Failed to get Excalidraw URL');
					} else {
						const blob = await this.readBlob(src);
						if (blob.type === 'image/svg+xml') {
							svg = await blob.text();
						} else {
							svg = '暂不支持' + blob.type;
						}
					}
					this.callback.updateElementByID(id, svg);
				}
			} else {
				console.error('container is null ' + name);
				this.callback.updateElementByID(id, '渲染失败');
			}
		} catch (error) {
			console.error(error.message);
			this.callback.updateElementByID(id, '渲染失败:' + error.message);
		}
	}

	markedExtension(): MarkedExtension {
		return {
			extensions: [{
				name: 'LocalImage',
				level: 'inline',
				start: (src: string) => {
					const index = src.indexOf('![[');
					if (index === -1) return;
					return index;
				},
				tokenizer: (src: string) => {
					const matches = src.match(LocalFileRegex);
					if (matches == null) return;
					const token: Token = {
						type: 'LocalImage',
						raw: matches[0],
						href: matches[1],
						text: matches[1]
					};
					return token;
				},
				renderer: (token: Tokens.Image) => {
					// 渲染本地图片
					let item = this.parseImageLink(token.href);
					if (item) {
						const src = this.getImagePath(item.path);
						const width = item.width ? `width="${item.width}"` : '';
						const height = item.height ? `height="${item.height}"` : '';
						return `<img src="${src}" alt="${token.text}" ${width} ${height} />`;
					}

					const info = this.parseExcalidrawLink(token.href);
					if (info) {
						const id = this.generateId();
						this.renderExcalidraw(info.file, id);
						return `<section class="${info.classname}"><section class="note-embed-excalidraw" id="${id}" ${info.style}>渲染中</section></section>`
					}

					const id = this.generateId();
					this.renderFile(token.href, id);
					const tag = this.callback.settings.embedStyle === 'quote' ? 'blockquote' : 'section';
					return `<${tag} class="note-embed-file" id="${id}">渲染中</${tag}>`
				}
			}]
		};
	}
}
