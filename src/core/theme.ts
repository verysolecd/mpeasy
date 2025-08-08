const defaultCss = `
.note-to-mp {
    padding: 20px 20px;
    user-select: text;
    -webkit-user-select: text;
    color: #222222;
    font-size: 16px;
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
}

.note-to-mp h1 {
    color: #222;
    font-weight: 700;
    font-size: 1.802em;
    line-height: 1.2;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h2 {
    color: inherit;
    font-weight: 600;
    font-size: 1.602em;
    line-height: 1.2;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h3 {
    color: inherit;
    font-weight: 600;
    font-size: 1.424em;
    line-height: 1.3;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h4 {
    color: inherit;
    font-weight: 600;
    font-size: 1.266em;
    line-height: 1.4;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp hr {
    border-color: #e0e0e0;
    margin-top: 3em;
    margin-bottom: 3em;
}

.note-to-mp p {
    line-height: 1.6em;
    margin: 1em 0;
}

.note-to-mp strong {
    color: var(--strong-color);
    font-weight: 600;
}

.note-to-mp blockquote {
    font-size: 1rem;
    display: block;
    margin: 2em 0;
    padding: 0em 0.8em 0em 0.8em;
    position: relative;
    color: inherit;
    border-left: 0.15rem solid #7852ee;
}

.note-to-mp a {
    color: #7852ee;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid #7852ee;
}

.note-to-mp table {
    width: 100%;
    text-align: left;
    margin-top: 2em;
    margin-bottom: 2em;
    font-size: 0.875em;
    border-collapse: collapse;
}

.note-to-mp table thead {
    font-weight: 600;
    border: #e0e0e0 1px solid;
}

.note-to-mp table th, .note-to-mp table td {
    padding: 0.5em;
    border: #e0e0e0 1px solid;
}

.note-to-mp img {
    margin-top: 2em;
    margin-bottom: 2em;
}

.note-to-mp code {
    font-family: Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace;
    color: #5c5c5c;
    background-color: #fafafa;
    font-size: 0.875em;
    padding: 0.2em 0.4em;
    border-radius: 3px;
}

.note-to-mp pre > code {
    display: block;
    padding: 1em;
    overflow-x: auto;
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
