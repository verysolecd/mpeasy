import * as React from 'react';

interface CssEditorProps {
    value: string;
    onChange: (newValue: string) => void;
}

const CssEditor = ({ value, onChange }: CssEditorProps) => {
    return (
        <div className="mpeasy-css-editor-container" style={{ padding: '10px' }}>
            <h4 style={{ marginTop: '0', marginBottom: '10px' }}>Live CSS Editor</h4>
            <textarea
                className="mpeasy-css-editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter custom CSS here to see it applied live in the preview..."
                style={{ width: '100%', height: '200px', fontFamily: 'monospace', fontSize: '12px' }}
            />
        </div>
    );
};

export default CssEditor;
