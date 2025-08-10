const defaultCss = `
/* --- Base Styles --- */
.note-to-mp {
    padding: 20px;
    user-select: text;
    -webkit-user-select: text;
    font-size: 16px;
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
}

.note-to-mp h1, .note-to-mp h2, .note-to-mp h3, .note-to-mp h4 {
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h1 { font-weight: 700; font-size: 1.802em; line-height: 1.2; }
.note-to-mp h2 { font-weight: 600; font-size: 1.602em; line-height: 1.2; }
.note-to-mp h3 { font-weight: 600; font-size: 1.424em; line-height: 1.3; }
.note-to-mp h4 { font-weight: 600; font-size: 1.266em; line-height: 1.4; }

.note-to-mp hr {
    margin-top: 3em;
    margin-bottom: 3em;
}

.note-to-mp p { line-height: 1.6em; margin: 1em 0; }
.note-to-mp strong { font-weight: 600; }

.note-to-mp blockquote {
    font-size: 1rem;
    display: block;
    margin: 2em 0;
    padding: 0em 0.8em;
    position: relative;
}

.note-to-mp a {
    text-decoration: none;
    font-weight: 500;
}

.note-to-mp table {
    width: 100%;
    text-align: left;
    margin: 2em 0;
    font-size: 0.875em;
    border-collapse: collapse;
}

.note-to-mp table thead { font-weight: 600; }
.note-to-mp table th, .note-to-mp table td { padding: 0.5em; }
.note-to-mp img { margin: 2em 0; }

.note-to-mp code {
    font-family: Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875em;
    padding: 0.2em 0.4em;
    border-radius: 3px;
}

.note-to-mp pre > code {
    display: block;
    padding: 1em;
    overflow-x: auto;
}

/* --- Light Theme --- */
.theme-light .note-to-mp {
    color: #222222;
    background-color: #ffffff;
}
.theme-light .note-to-mp h1 { color: #222; }
.theme-light .note-to-mp strong { color: #c91616; } /* Example strong color for light theme */
.theme-light .note-to-mp blockquote { border-left: 0.15rem solid #7852ee; }
.theme-light .note-to-mp a { color: #7852ee; border-bottom: 1px solid #7852ee; }
.theme-light .note-to-mp hr { border-color: #e0e0e0; }
.theme-light .note-to-mp table, .theme-light .note-to-mp th, .theme-light .note-to-mp td { border-color: #e0e0e0; }
.theme-light .note-to-mp code {
    color: #5c5c5c;
    background-color: #fafafa;
}

/* --- Dark Theme --- */
.theme-dark .note-to-mp {
    color: #cccccc;
    background-color: #1e1e1e;
}
.theme-dark .note-to-mp h1, .theme-dark .note-to-mp h2, .theme-dark .note-to-mp h3, .theme-dark .note-to-mp h4 {
    color: #d4d4d4;
}
.theme-dark .note-to-mp strong { color: #ff8b8b; } /* Example strong color for dark theme */
.theme-dark .note-to-mp blockquote { border-left: 0.15rem solid #9a82f2; }
.theme-dark .note-to-mp a { color: #9a82f2; border-bottom: 1px solid #9a82f2; }
.theme-dark .note-to-mp hr { border-color: #444444; }
.theme-dark .note-to-mp table, .theme-dark .note-to-mp th, .theme-dark .note-to-mp td { border: #555555 1px solid; }
.theme-dark .note-to-mp :not(pre) > code {
    color: #d4d4d4;
    background-color: #252526;
}

/* --- TOC Styles --- */
.markdown-toc {
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 1em;
}
.toc-ul {
    list-style: none;
    padding-left: 1rem;
    margin-left: 0.5rem;
}
.toc-li {
    margin-bottom: 0.25rem;
}
.toc-li a {
    text-decoration: none;
    transition: color 0.2s ease-in-out;
}
.toc-li a:hover {
    text-decoration: underline;
}

/* --- Light Theme TOC --- */
.theme-light .markdown-toc {
    background-color: #f8f8f8;
}
.theme-light .toc-ul {
    border-left: 1px solid #e0e0e0;
}
.theme-light .toc-li a {
    color: #333333;
}
.theme-light .toc-li a:hover {
    color: #7852ee;
}

/* --- Dark Theme TOC --- */
.theme-dark .markdown-toc {
    background-color: #2a2a2a;
}
.theme-dark .toc-ul {
    border-left: 1px solid #555555;
}
.theme-dark .toc-li a {
    color: #cccccc;
}
.theme-dark .toc-li a:hover {
    color: #9a82f2;
}
`;

export const themeMap = {
  default: {
    name: '默认',
    css: defaultCss,
  },
  // We can add other themes here in the same string-based format if needed.
};

export const themeOptions = [
  {
    label: '默认',
    value: 'default',
  },
];