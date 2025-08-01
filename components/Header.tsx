import * as React from 'react';

interface HeaderProps {
    onCopy: () => void;
    onUpload: () => void;
}

const Header = ({ onCopy, onUpload }: HeaderProps) => {
    return (
        <div className="mpeasy-view-header">
            <h3 className="mpeasy-header-title">MPEasy 预览</h3>
            <div className="mpeasy-header-actions">
                <button className="mod-cta" onClick={onCopy}>
                    复制 HTML
                </button>
                <button onClick={onUpload}>
                    上传到公众号
                </button>
            </div>
        </div>
    );
};

export default Header;