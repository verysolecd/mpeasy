const marked = require('marked');

// 自定义渲染器
const renderer = new marked.Renderer();

// 重写代码块渲染逻辑
renderer.code = function(code, lang, escaped) {
  // 检测 Obsidian Callout 格式（ad-xxx）
  if (lang && lang.startsWith('ad-')) {
    const calloutType = lang.slice(3); // 提取类型（如 'important'）
    const titleMatch = code.match(/^\[(.*?)\]\n/);
    let title = titleMatch ? titleMatch[1] : getDefaultTitle(calloutType);
    let content = titleMatch ? code.replace(titleMatch[0], '') : code;
    
    // 渲染内容为 HTML（支持内部 Markdown）
    const renderedContent = marked.parse(content);
    
    // 微信公众号兼容的内联样式（避免外部CSS）
    const styles = {
      container: 'margin: 16px 0; padding: 12px 16px; border-radius: 4px;',
      header: 'display: flex; align-items: center; margin-bottom: 8px; font-weight: bold;',
      icon: 'margin-right: 8px; font-size: 18px;',
      content: 'line-height: 1.6;'
    };
    
    // 根据类型定义主题色（适配常见 callout 类型）
    const themes = {
      important: { border: 'border-left: 4px solid #4CAF50;', color: 'color: #2E7D32;' },
      note: { border: 'border-left: 4px solid #2196F3;', color: 'color: #1565C0;' },
      warning: { border: 'border-left: 4px solid #FF9800;', color: 'color: #E65100;' },
      danger: { border: 'border-left: 4px solid #F44336;', color: 'color: #B71C1C;' },
      tip: { border: 'border-left: 4px solid #9C27B0;', color: 'color: #6A1B9A;' }
    };
    
    // 应用主题（默认使用 note 样式）
    const theme = themes[calloutType] || themes.note;
    
    return `
      <div style="${styles.container} ${theme.border} background-color: rgba(33, 150, 243, 0.05);">
        <div style="${styles.header} ${theme.color}">
          <span style="${styles.icon}">${getIcon(calloutType)}</span>
          <span>${title}</span>
        </div>
        <div style="${styles.content}">${renderedContent}</div>
      </div>
    `;
  }
  
  // 非 callout 代码块使用默认渲染
  return marked.Renderer.prototype.code.call(this, code, lang, escaped);
};

// 辅助函数：获取默认标题
function getDefaultTitle(type) {
  const titles = {
    important: '重要',
    note: '笔记',
    warning: '警告',
    danger: '危险',
    tip: '提示'
  };
  return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// 辅助函数：获取图标（微信公众号支持的 emoji）
function getIcon(type) {
  const icons = {
    important: '❗',
    note: '📝',
    warning: '⚠️',
    danger: '🚨',
    tip: '💡'
  };
  return icons[type] || '🔖';
}