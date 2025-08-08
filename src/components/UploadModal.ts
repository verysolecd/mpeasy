import { App, Modal, Setting, requestUrl, Notice } from 'obsidian';

export class UploadModal extends Modal {
    title: string;
    coverUrl: string;
    onSubmit: (title: string, coverUrl: string) => void;

    constructor(app: App, onSubmit: (title: string, coverUrl: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "上传到公众号草稿" });

        new Setting(contentEl)
            .setName("标题")
            .setDesc("请输入文章标题")
            .addText((text) => {
                text.onChange((value) => {
                    this.title = value;
                });
            });

        new Setting(contentEl)
            .setName("封面图 URL")
            .setDesc("请输入封面图的链接")
            .addText((text) => {
                text.onChange((value) => {
                    this.coverUrl = value;
                });
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("上传")
                    .setCta()
                    .onClick(() => {
                        if (!this.title || !this.coverUrl) {
                            new Notice("请输入标题和封面图 URL。");
                            return;
                        }
                        this.close();
                        this.onSubmit(this.title, this.coverUrl);
                    }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}