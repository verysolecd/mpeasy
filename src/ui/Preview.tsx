import * as React from 'react';

interface Props {
    html: string;
    onCopy: () => void;
}

const Preview: React.FC<Props> = ({ html, onCopy }) => {
    return (
        <div className="mpeasy-preview-pane">
            <h2>Preview</h2>
            <div className="mpeasy-rendered-content" dangerouslySetInnerHTML={{ __html: html }}></div>
            <button onClick={onCopy}>Copy to WeChat</button>
        </div>
    );
};

export default Preview;
