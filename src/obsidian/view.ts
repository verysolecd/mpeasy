import { ItemView, WorkspaceLeaf, TFile, Vault, normalizePath } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import App from '../view';

export const MPEASY_VIEW_TYPE = 'mpeasy-view';

export class MpeasyView extends ItemView {
    private root: Root | null = null;
    private fileContent: string = '';
    private cssContent: string = '';
    private availableCodeThemes: string[] = [];

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.onFileModified = this.onFileModified.bind(this);
        this.handleActiveLeafChange = this.handleActiveLeafChange.bind(this);
    }

    getViewType() {
        return MPEASY_VIEW_TYPE;
    }

    getDisplayText() {
        return 'MPEasy Preview';
    }

    async onOpen() {
        this.contentEl.empty();
        this.contentEl.style.height = '100%';
        const rootEl = this.contentEl.createEl('div');
        rootEl.id = 'mpeasy-react-root';
        rootEl.style.height = '100%';

        this.root = createRoot(rootEl);
        
        await this.loadStyles();

        this.registerEvent(this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange));
        this.registerEvent(this.app.vault.on('modify', this.onFileModified));
        
        this.updateContent(this.app.workspace.getActiveFile());
    }

    async onClose() {
        this.root?.unmount();
    }

    handleActiveLeafChange() {
        this.updateContent(this.app.workspace.getActiveFile());
    }

    async onFileModified(file: TFile) {
        const activeFile = this.app.workspace.getActiveFile();
        if (file === activeFile) {
            this.updateContent(file);
        }
    }

    async updateContent(file: TFile | null) {
        if (file) {
            this.fileContent = await this.app.vault.cachedRead(file);
        } else {
            this.fileContent = '# MPEasy\n\nOpen a markdown file to see the preview.';
        }
        this.renderView();
    }

    async loadStyles() {
        const adapter = this.app.vault.adapter;
        // Load main stylesheet
        const cssPath = `${this.app.vault.configDir}/plugins/mpeasy/styles.css`;
        try {
            if (await adapter.exists(cssPath)) {
                this.cssContent = await adapter.read(cssPath);
            } else {
                console.error('MPEasy: styles.css not found!');
                this.cssContent = '';
            }
        } catch (error) {
            console.error('MPEasy: Error loading styles.css', error);
        }

        // Load available code block themes
        const codeThemeDir = normalizePath(`${this.app.vault.configDir}/plugins/mpeasy/Dist/assets/codestyle`);
        try {
            if (await adapter.exists(codeThemeDir)) {
                const result = await adapter.list(codeThemeDir);
                this.availableCodeThemes = result.files.map(p => p.split('/').pop() || '').filter(n => n.endsWith('.css'));
            } else {
                console.error('MPEasy: Code style directory not found!');
            }
        } catch (error) {
            console.error('MPEasy: Error listing code themes', error);
        }
    }

    getCodeThemeUrl(themeFile: string): string {
        const basePath = (this.app.vault.adapter as any).getBasePath();
        const relativePath = normalizePath(`${this.app.vault.configDir}/plugins/mpeasy/assets/codestyle/${themeFile}`);
        // Use a file system path and convert to a resource URL
        const absolutePath = `${basePath}/${relativePath}`;
        return this.app.vault.adapter.getResourcePath(absolutePath);
    }

    async getCodeThemeCss(themeFile: string): Promise<string> {
        const path = normalizePath(`${this.app.vault.configDir}/plugins/mpeasy/Dist/assets/codestyle/${themeFile}`);
        try {
            if (await this.app.vault.adapter.exists(path)) {
                return await this.app.vault.adapter.read(path);
            }
        } catch (error) {
            console.error(`MPEasy: Could not read code theme css file: ${path}`, error);
        }
        return ''; // Return empty string if not found or error
    }

    renderView() {
        if (this.root) {
            const props = { 
                fileContent: this.fileContent, 
                cssContent: this.cssContent,
                availableCodeThemes: this.availableCodeThemes,
                getCodeThemeUrl: this.getCodeThemeUrl.bind(this),
                getCodeThemeCss: this.getCodeThemeCss.bind(this)
            };
            this.root.render(
                <React.StrictMode>
                    <App {...props} />
                </React.StrictMode>
            );
        }
    }
}