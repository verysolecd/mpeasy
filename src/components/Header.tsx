import * as React from 'react';

interface HeaderProps {
    onRefresh: () => void;
    onCopy: () => void;
    onUpload: () => void;
}

const Header = ({ onRefresh, onCopy, onUpload }: HeaderProps) => {
    return (
        <div className="mpeasy-view-header">
            <h3 className="mpeasy-header-title">MPEasy 预览</h3>
            <div className="mpeasy-header-actions">
                <button onClick={onRefresh}>
                    刷新
                </button>
                <button className="mod-cta" onClick={onCopy}>
                    复制
                </button>
                <button onClick={onUpload}>
                    上传公众号
                </button>
            </div>
        </div>
    );
};

export default Header;