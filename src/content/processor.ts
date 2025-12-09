import { App, TFile } from 'obsidian';
import { getMimeTypeFromFilename } from '../utils/config/utils/fileHelpers';
import { uploadContentImage } from '../utils/wechat/api';
import { resolveImagePath } from './image-handler';
import { inlineStyles } from './style-inliner';
import MPEasyPlugin from '../core/main';
import { getFrontmatterData } from './frontmatter';

// Options for processing content
interface ProcessOptions {
    app?: App;
    sourcePath?: string;
    processImages?: boolean;
    accessToken?: string;
    plugin?: MPEasyPlugin;
}

async function processHtmlImages(doc: Document, options: ProcessOptions): Promise<void> {
    const { app, sourcePath, accessToken } = options;
    if (!app || !sourcePath || !accessToken) return;

    for (const imgEl of Array.from(doc.querySelectorAll('img'))) {
        const dataSrc = imgEl.getAttribute('data-src') || imgEl.getAttribute('src');
        if (!dataSrc) continue;

        try {
            let blob: Blob;
            let imageName = 'image.png'; // Default name

            if (dataSrc.startsWith('http')) {
                // Network image: fetch and create a blob
                const response = await fetch(dataSrc);
                if (!response.ok) {
                    console.warn(`MPEasy: Failed to fetch network image: ${dataSrc}. Status: ${response.status}`);
                    continue; // Skip this image
                }
                blob = await response.blob();
                try {
                    const url = new URL(dataSrc);
                    const pathParts = url.pathname.split('/');
                    imageName = pathParts[pathParts.length - 1] || imageName;
                } catch { /* ignore URL parsing errors, use default name */ }

            } else {
                // Local image: use existing logic
                const imageFile = resolveImagePath(app, dataSrc, sourcePath);
                if (imageFile instanceof TFile) {
                    const arrayBuffer = await app.vault.readBinary(imageFile);
                    blob = new Blob([arrayBuffer], { type: getMimeTypeFromFilename(imageFile.name) });
                    imageName = imageFile.name;
                } else {
                    console.warn(`MPEasy: Could not resolve local image: ${dataSrc}`);
                    continue; // Skip if local image can't be resolved
                }
            }
            
            // Unified upload logic
            const uploadedUrl = await uploadContentImage(accessToken, blob, imageName);
            imgEl.setAttribute('src', uploadedUrl);
            imgEl.setAttribute('data-src', uploadedUrl);

        } catch (error) {
            console.error(`MPEasy: Failed to process image: ${dataSrc}`, error);
        }
    }
}

function processWXhtml(doc: Document): void {
    // 1. Transform headings
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading: HTMLElement) => {
        // For H1/H2 with display: table, use the original transformation
        if (heading.style.display === 'table') {
            const innerSpan = doc.createElement('span');
            innerSpan.innerHTML = heading.innerHTML;
            heading.innerHTML = '';
            heading.appendChild(innerSpan);

            const outerStyles: Record<string, string> = {};
            const innerStyles: Record<string, string> = {};

            for (let i = 0; i < heading.style.length; i++) {
                const key = heading.style[i];
                const value = heading.style.getPropertyValue(key);
                if (key.startsWith('margin') || key === 'text-align') {
                    outerStyles[key] = value;
                } else {
                    innerStyles[key] = value;
                }
            }

            heading.style.cssText = '';
            Object.assign(heading.style, outerStyles);
            Object.assign(innerSpan.style, innerStyles);
            innerSpan.style.display = 'inline-block'; // Keep for H1/H2
        } 
        // For H3-H6, apply a block-level transformation to preserve styles
        else {
            const innerSpan = doc.createElement('span');
            innerSpan.innerHTML = heading.innerHTML;
            heading.innerHTML = '';
            heading.appendChild(innerSpan);

            const outerStyles: Record<string, string> = {};
            const innerStyles: Record<string, string> = {};

            for (let i = 0; i < heading.style.length; i++) {
                const key = heading.style[i];
                const value = heading.style.getPropertyValue(key);
                if (key.startsWith('margin')) {
                    outerStyles[key] = value;
                } else {
                    innerStyles[key] = value;
                }
            }

            heading.style.cssText = '';
            Object.assign(heading.style, outerStyles);
            Object.assign(innerSpan.style, innerStyles);
            innerSpan.style.display = 'block'; // Use 'block' to ensure styles are preserved and full-width
        }
    });

    // 2. Add classes to tables and blockquotes for WeChat
    doc.querySelectorAll('table').forEach(table => table.classList.add('custom-table'));
    doc.querySelectorAll('blockquote').forEach(bq => bq.classList.add('custom-quote'));

    // 3. Handle paragraph indentation for WeChat
    doc.querySelectorAll('p').forEach((p: HTMLElement) => {
        // Check if the paragraph has an inline style with text-indent
        if (p.style.textIndent) {
            // Remove the text-indent style property
            p.style.removeProperty('text-indent');

            // Prepend two full-width spaces to the paragraph's content
            const firstChild = p.firstChild;
            if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                // If the first child is a text node, just prepend to its content
                firstChild.textContent = '　　' + firstChild.textContent;
            } else {
                // Otherwise, create a new text node and insert it at the beginning
                const spaceNode = doc.createTextNode('　　');
                p.insertBefore(spaceNode, p.firstChild);
            }
        }
    });
}

export interface ProcessedContent {
    html: string;
    plainText: string;
}

export async function processContent(
    html: string, 
    options: ProcessOptions
): Promise<ProcessedContent> {
    const { processImages, plugin } = options;

    // 1. Inline all CSS styles from <style> tags and external files
    const inlinedHtml = plugin ? await inlineStyles(html, plugin) : html;
    
    // 2. Create a DOM document
    const parser = new DOMParser();
    const doc = parser.parseFromString(inlinedHtml, 'text/html');
    
    // 3. Process for WeChat if necessary (which includes image uploading)
    if (processImages) {
        await processHtmlImages(doc, options);
        processWXhtml(doc);
    }

    // 4. Ensure all images have data-src for WeChat
    doc.querySelectorAll('img').forEach(img => {
        if (!img.dataset.src) {
            img.dataset.src = img.src;
        }
    });

    // 5. Generate final HTML
    let finalHtml = doc.body.innerHTML;

    // 6. Add header and footer if enabled
    if (plugin?.settings.styleSettings.enableFrontal) {
        const frontalMdPath = 'assets/frontal.md';
        try {
            const frontalMdContent = await plugin.app.vault.adapter.read(frontalMdPath);
            const separator = '<!-- FOOTER -->';
            const parts = frontalMdContent.split(separator);
            let headerHtml = parts[0] || '';
            const footerHtml = parts.length > 1 ? parts[1] : '';
            
            const file = plugin.app.workspace.getActiveFile();
            if (file) {
                const { epigraph, author } = getFrontmatterData(plugin.app, file);

                // Replace epigraph placeholder
                if (epigraph) {
                    // This assumes a simple {{epigraph}} placeholder in the template
                    headerHtml = headerHtml.replace(/\{\{epigraph\}\}/g, epigraph);
                    // And this handles the conditional block
                    headerHtml = headerHtml.replace(/\{\{#epigraph\}\}([\s\S]*?)\{\{\/epigraph\}\}/g, (match, p1) => p1.replace(/\{\{epigraph\}\}/g, epigraph));

                } else {
                    // Remove the epigraph block if it's not present
                    headerHtml = headerHtml.replace(/\{\{#epigraph\}\}([\s\S]*?)\{\{\/epigraph\}\}/g, '');
                    headerHtml = headerHtml.replace(/\{\{epigraph\}\}/g, '');
                }

                // Replace author placeholder
                if (author) {
                    headerHtml = headerHtml.replace(/\{\{author\}\}/g, author);
                } else {
                    headerHtml = headerHtml.replace(/\{\{author\}\}/g, '佚名'); // Default if author is not set
                }
            }

            // Inject header after the word count block, if it exists
            const wordCountRegex = /<blockquote[^>]*>[\s\S]*?字数[\s\S]*?<\/blockquote>/;
            const match = finalHtml.match(wordCountRegex);

            if (match && match[0]) {
                finalHtml = finalHtml.replace(match[0], match[0] + headerHtml);
            } else {
                finalHtml = headerHtml + finalHtml;
            }

            // Append footer
            if (footerHtml) {
                finalHtml += footerHtml;
            }

        } catch (error) {
            console.error(`MPEasy: Failed to read or process ${frontalMdPath}`, error);
        }
    }

    // 7. Re-apply the old code block processing for WeChat using regex
    if (processImages) {
        finalHtml = finalHtml.replace(/<pre([^>]*)><code([^>]*)>(.*?)<\/code><\/pre>/gis, (match, preAttrs, codeAttrs, content) => {
            const langMatch = (codeAttrs as string).match(/class="language-([^"]*)"/i);
            const lang = langMatch ? langMatch[1] : '';
            return `<pre class="code-snippet__js" data-lang="${lang}">${content}</pre>`;
        });
    }

    // 8. Generate plain text version
    const plainText = doc.body.textContent || '';
    
    return {
        html: finalHtml,
        plainText
    };
}