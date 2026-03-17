# MPEasy 核心逻辑分析与架构优化方案

本文档旨在分析 MPEasy 插件当前版本中渲染、复制和上传草稿的核心逻辑路径，并针对“上传草稿到公众号后样式与预览不一致”的问题，提出一个专业、可行的架构解决方案。

## 一、 核心逻辑路径分析

通过对 `src/MPEasyView.tsx` 和 `src/utils/contentProcessor.ts` 等关键文件的分析，插件的核心工作流程如下：

### 1. 渲染逻辑路径

此路径负责将 Markdown 文本在 Obsidian 的 MPEasy 视图中渲染出带样式的预览效果。

```mermaid
graph TD
    A[用户打开 MPEasy 视图] --> B{MPEasyView.tsx: refreshView};
    B --> C{读取 Markdown 原文};
    B --> D{读取插件设置 (主题, 字体等)};
    D --> E{加载主题CSS文件 (theme.less, custom.css, highlight.css)};
    E --> F[将CSS内容注入到视图的 &lt;style&gt; 标签中];
    C --> G{initRenderer & renderMarkdown};
    G --> H[生成基础 HTML 结构];
    H & F --> I[浏览器结合HTML和CSS, 渲染出最终预览效果];
    I --> J{processLocalImages: 处理本地图片路径};
    J --> K[将图片 src 从本地路径转换为 app://... 路径];
```

- **摘要**: 渲染过程是“HTML+CSS”分离的传统Web渲染模式。HTML 结构由 Markdown 转换而来，而样式则由外部加载的 CSS 文件提供。二者在 WebView 环境中由浏览器合并渲染，因此预览效果正确。

### 2. 复制逻辑路径

此路径负责在用户点击“复制”按钮时，将内容处理后放入系统剪贴板。

```mermaid
graph TD
    A[用户点击复制] --> B{MPEasyView.tsx: copyRenderedHtml};
    B --> C{获取预览区的 innerHTML};
    C --> D{contentProcessor.ts: processContent(html, {processImages: false})};
    D --> E[执行格式保护和清理];
    E --> F{utils/clipboard.ts: copyHtml};
    F --> G[将处理后的HTML和纯文本放入剪贴板];
```

- **摘要**: 复制功能获取的是已经渲染好的 HTML **结构**，但它**不会**处理 `<style>` 标签中的 CSS 规则。`processContent` 在此路径下主要做一些清理工作，不涉及图片上传。

### 3. 上传草稿逻辑路径

此路径负责将文章内容作为草稿发送到微信公众号平台。

```mermaid
graph TD
    A[用户点击上传草稿] --> B{MPEasyView.tsx: sendToWeChatDraft};
    B --> C{获取 Access Token};
    B --> D{处理封面: 上传图片获取 thumb_media_id};
    B --> E{获取预览区的 innerHTML};
    E --> F{contentProcessor.ts: processContent(html, {processImages: true})};
    F --> G{processHtmlImages: 处理内容图片};
    G --> H[遍历img标签, 上传本地图片到微信服务器];
    H --> I[替换 img 的 src 为微信URL];
    I --> J{processForWechat: 微信格式适配};
    J --> K[为代码块、表格等添加微信特定的class];
    K --> L{Wx/api.ts: addDraft};
    L --> M[发送最终处理过的HTML到微信服务器];
```

- **摘要**: 上传路径的核心是 `processContent`。它不仅包含了复制路径的清理功能，还增加了两个关键步骤：**上传本地图片**并替换链接，以及**适配微信特有的格式**。但与复制路径一样，它**完全没有处理样式**。

---

## 二、 样式不一致问题的根源

综合以上三个流程，问题根源非常明确：

**插件将样式（CSS）和结构（HTML）进行了分离处理。渲染时两者都在，而复制和上传时，只传递了结构（HTML），完全丢失了样式（CSS）。**

微信公众号编辑器是一个富文本编辑器，它会过滤掉绝大部分外部 `class` 和所有 `<style>` 标签。要在其中完美还原样式，唯一可靠的方法就是将所有 CSS 规则计算后，作为内联样式（`style="..."`）直接写入到每一个 HTML 标签上。

---

## 三、 架构优化方案：引入CSS内联处理层

为了从根本上解决问题，我建议在 `contentProcessor.ts` 中引入一个**CSS内联处理层**。此方案遵循“精确解耦”和“最小化侵入”的原则。

### 1. 核心思路

在生成最终要复制或上传的 HTML 之前，增加一个步骤：**收集所有相关的 CSS 规则，并使用专业库将这些规则内联到 HTML 元素中**。

### 2. 建议引入的库

**[Juice](https://github.com/Automattic/juice)** - 这是一个非常成熟和流行的 Node.js 库，专门用于将 CSS 规则内联到 HTML 中，广泛应用于发送HTML邮件（与公众号场景类似）。

### 3. 优化后的逻辑流程

新的 `processContent` 函数逻辑应该如下：

```mermaid
graph TD
    subgraph contentProcessor.ts: processContent
        A[接收原始 HTML] --> B{创建 DOM 文档对象};
        B --> C{**新增: CSS 内联处理层**};
        C --> D{读取所有相关CSS文件内容};
        D --> E{读取 theme.less, styles.css, code-theme.css};
        E --> F{使用 Juice 库将 CSS 规则内联到 DOM 对象的每个元素中};
        F --> G{处理图片 (上传或转换路径)};
        G --> H{微信格式适配};
        H --> I[序列化 DOM 为最终的 HTML 字符串];
    end
    I --> J[输出带内联样式的、自包含的HTML];
```

### 4. 实施步骤

1.  **添加依赖**:
    ```bash
    npm install juice --save
    # 如果需要读取 .less 文件，可能还需要 less
    npm install less --save-dev
    ```

2.  **创建样式内联模块**:
    新建 `src/utils/styleInliner.ts` 文件，负责CSS的读取和内联。

    ```typescript
    // src/utils/styleInliner.ts
    import juice from 'juice';
    import { App } from 'obsidian';
    import { StyleSettings } from '../shared/types/settings';

    // 这是一个示例实现，需要根据实际情况调整CSS文件路径
    async function getCssRules(app: App, settings: StyleSettings): Promise<string> {
        let css = '';
        
        // 1. 读取基础样式
        // 注意：需要找到正确的文件路径，可能需要 adapter
        // const baseCss = await app.vault.adapter.read(`${app.vault.configDir}/plugins/mpeasy/styles.css`);
        // css += baseCss;

        // 2. 读取主题样式 (less需要先编译，或直接读取编译后的css)
        // const themeCss = await app.vault.adapter.read(...);
        // css += themeCss;

        // 3. 读取代码高亮主题
        if (settings.codeThemeName && settings.codeThemeName !== 'none') {
            const codeThemeCss = await app.vault.adapter.read(settings.codeThemeName);
            css += codeThemeCss;
        }
        
        return css;
    }

    export async function inlineStyles(html: string, app: App, settings: StyleSettings): Promise<string> {
        const css = await getCssRules(app, settings);
        
        // 使用 Juice 进行内联
        const inlinedHtml = juice(html, {
            extraCss: css,
            removeStyleTags: true, // 移除 &lt;style&gt; 标签
            applyStyleTags: true,  // 应用 &lt;style&gt; 标签中的样式
        });

        return inlinedHtml;
    }
    ```

3.  **修改 `processContent`**:
    在 `processContent` 函数中，调用 `inlineStyles`。

    ```typescript
    // src/utils/contentProcessor.ts
    import { inlineStyles } from './styleInliner'; // 引入新模块

    export async function processContent(
        html: string, 
        options: ProcessOptions
    ): Promise<ProcessedContent> {
        const { processImages, app, pluginSettings } = options; // 假设传入了app和settings
        
        // 1. 新增：执行样式内联
        let inlinedHtml = html;
        if (app && pluginSettings) {
             inlinedHtml = await inlineStyles(html, app, pluginSettings.styleSettings);
        }

        // 2. 基于内联后的HTML创建DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(inlinedHtml, 'text/html');
        
        // 3. 处理图片 (如果需要)
        if (processImages) {
            await processHtmlImages(doc, options);
        }
        
        // ... 后续流程不变 ...

        let finalHtml = doc.body.innerHTML;
        // ...

        return {
            html: finalHtml,
            plainText
        };
    }
    ```

### 5. 优势

*   **根本性解决**: 直接生成符合微信编辑器规范的自包含HTML，一劳永逸。
*   **高复用性**: 无论是“复制”还是“上传草稿”，都能享受到样式一致的好处。
*   **低侵入性**: 改动集中在 `contentProcessor`，对现有渲染逻辑和UI逻辑无任何影响。
*   **专业可靠**: 借助 `juice` 这样的专业库，无需手动处理复杂的CSS选择器和优先级问题，稳定且强大。

此方案将极大提升 MPEasy 插件的用户体验和专业性，使其成为一个真正“所见即所得”的公众号排版工具。
