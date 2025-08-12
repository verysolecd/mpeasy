import { App, Modal, Setting, requestUrl, Notice } from 'obsidian';

export class UploadModal extends Modal {
    onSubmit: (data: { title?: string; coverUrl?: string }) => void;

    constructor(app: App, onSubmit: (data: { title?: string; coverUrl?: string }) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "上传到公众号草稿" });

        // Removed manual title and coverUrl input fields as they will be extracted from front matter

        new Setting(contentEl)
            .addButton((btn) => {
                btn
                    .setButtonText("上传")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        // The onSubmit callback will be called with data from MPEasyViewComponent
                        this.onSubmit({}); // Pass an empty object, actual data comes from MPEasyViewComponent
                    });
            })
            .addButton((btn) => {
                btn
                    .setButtonText("取消")
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}