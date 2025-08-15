import * as React from 'react';
import { useState } from 'react';
import type { IOpts } from '../types';

interface WeChatArticleSettingsProps {
    opts: Partial<IOpts>;
    onOptsChange: (newOpts: Partial<IOpts>) => void;
}

const WeChatArticleSettings = ({ opts, onOptsChange }: WeChatArticleSettingsProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const handleValueChange = (key: keyof IOpts, value: any) => {
        onOptsChange({ [key]: value });
    };

    return (
        <div className="wechat-article-settings-container" style={{ marginBottom: '16px', padding: '0' }}>
            <div className="wechat-article-settings-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                userSelect: 'none',
                width: '100%',
                boxSizing: 'border-box'
            }} onClick={() => setIsCollapsed(!isCollapsed)}>
                <h3 className="wechat-article-settings-title" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    公众号文章设置
                </h3>
                <div style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>∨</span>
                </div>
            </div>
            {!isCollapsed && (
                <form className="style-panel-form" style={{ padding: '0 8px' }}>
                <div className="style-panel-item">
                    <label>开启评论</label>
                    <input
                        type="checkbox"
                        checked={opts.enableComments !== false}
                        onChange={(e) => handleValueChange('enableComments', e.target.checked)}
                    />
                </div>

                <div className="style-panel-item">
                    <label>允许所有人评论</label>
                    <input
                        type="checkbox"
                        checked={opts.onlyFansCanComment !== false}
                        onChange={(e) => handleValueChange('onlyFansCanComment', e.target.checked)}
                    />
                </div>
            </form>
            )}
        </div>
    );
};

export default WeChatArticleSettings;