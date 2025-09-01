import React, { useState } from 'react';
import { marked } from 'marked';
import ShadowView from './components/ShadowView';
import StylePanel from './components/StylePanel';
import juice from 'juice';
import { Notice } from 'obsidian';

interface AppProps {
  fileContent: string;
  cssContent: string;
}

const App: React.FC<AppProps> = ({ fileContent, cssContent }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const handleCopy = () => {
        if (!fileContent) {
            new Notice('No content to copy.');
            return;
        }
        const rawHtml = marked(fileContent) as string;
        const containerClass = isDarkMode ? 'markdown-body dark' : 'markdown-body';
        const htmlToInline = `<div class="${containerClass}">${rawHtml}</div>`;
        const inlinedHtml = juice(htmlToInline, { extraCss: cssContent });

        navigator.clipboard.writeText(inlinedHtml).then(() => {
            new Notice('Copied to clipboard successfully!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            new Notice('Failed to copy to clipboard.');
        });
    };

    const handleUpload = () => {
        new Notice('Upload to Drafts: Not yet implemented. Please configure API keys in settings first.');
        console.log('--- Simulating Upload Process ---');
        if (!fileContent) {
            console.log('No content to upload.');
            return;
        }
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        let match;
        const localImages = [];
        const networkImages = [];
        while ((match = imageRegex.exec(fileContent)) !== null) {
            const imageUrl = match[2];
            if (imageUrl.startsWith('http') || imageUrl.startsWith('https')) {
                networkImages.push(imageUrl);
            } else {
                localImages.push(imageUrl);
            }
        }
        console.log('Found local images that would need uploading:', localImages);
        console.log('Found network images that would be used directly:', networkImages);
        console.log('--- End of Simulation ---');
    };

    if (!fileContent && fileContent !== '') {
        return <div>Loading file...</div>;
    }

    const html = marked(fileContent);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="mpeasy-toolbar" style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px' }}>
                <button onClick={handleCopy}>Copy to WeChat</button>
                <button onClick={handleUpload}>Upload to Drafts</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <ShadowView html={html as string} css={cssContent} isDarkMode={isDarkMode} />
                </div>
                <StylePanel isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
            </div>
        </div>
    );
};

export default App;