# refmd 到 mpeasy 插件详细移植方案

本文档基于对 `refmd` 源代码的深入分析，为将其核心渲染与复制功能移植到 Obsidian 插件 `mpeasy` 提供了详细的技术步骤和注意事项。

## 1. `refmd` 核心代码分析总结

`refmd` 的架构设计高度服务于其“复制即所得”的目标，其核心机制可以总结如下：

- **渲染即内联 (Render with Inline Styles)**：`refmd` 的核心 `renderer-impl.ts` 使用 `marked.js` 作为 Markdown 解析器。其最关键的特性是，在将 Markdown 转换为 HTML 的过程中，通过一个强大的 `styleMapping` (样式映射) 对象，**直接将所有 CSS 样式作为内联 `style` 属性写入了每一个生成的 HTML 标签中**。最终输出的不是“HTML + CSS”，而是一个自包含的、富文本式的 HTML 字符串。

- **强大的扩展支持**：渲染器通过 `marked` 的插件机制，集成了对 KaTeX (数学公式)、Mermaid/PlantUML (图表)、脚注、自定义警告框等复杂功能的支持。这些扩展同样遵循样式内联的原则。

- **直接的剪贴板操作**：`clipboard.ts` 中的 `copyHtml` 函数接收渲染器生成的 HTML 字符串，并利用 `navigator.clipboard.write` API 将其作为 `text/html` 类型写入剪贴板。此过程不涉及任何新的样式计算，仅仅是内容的“搬运”。

这个架构完美契合了移植到 Obsidian 并复制到公众号编辑器的需求。

## 2. 详细移植步骤

### 第 1 步：搭建插件基础环境

1.  **初始化项目**：在 `mpeasy/src` 目录下，创建 Obsidian 插件的标准入口文件 `main.ts`、插件清单 `manifest.json` 和一个空的样式文件 `styles.css`。
2.  **安装核心依赖**：根据 `refmd` 的 `package.json` 分析，我们需要在 `mpeasy` 项目中安装以下核心依赖：
    ```bash
    npm install marked highlight.js front-matter mermaid reading-time
    ```
    *   `marked`: Markdown 解析器。
    *   `highlight.js`: 代码语法高亮。
    *   `front-matter`: 用于解析 Markdown 文件头部的 `YAML` 配置。
    *   `mermaid`: 用于渲染 mermaid 图表。
    *   `reading-time`: 用于计算阅读时长。

### 第 2 步：移植渲染器核心

这是整个移植工作中最关键的一步。

1.  **移植 `core` 包**：将 `refmd/md/packages/core/src/` 目录下的 `renderer`、`extensions` 和 `utils` 文件夹完整复制到 `mpeasy/src/` 下的一个新目录，例如 `mpeasy/src/renderer/`。
2.  **移植 `shared` 配置**：同样，将 `refmd/md/packages/shared/src/` 下的 `configs` 和 `types` 目录复制到 `mpeasy/src/` 下，例如 `mpeasy/src/config/`。
3.  **改造 `renderer-impl.ts`**：
    *   将 `initRenderer` 函数导出，并调整其导入路径，使其能够正确找到上一步复制过来的 `extensions` 和 `utils`。
    *   这个函数将成为我们插件的渲染引擎。

### 第 3 步：移植主题与样式

1.  **复制样式文件**：将 `refmd/md/apps/web/src/assets/less/theme.less` 文件复制到 `mpeasy/src/styles/` 目录下，并可根据需要转换为 CSS。同时，将 `refmd/md/packages/shared/src/configs/theme.ts` 提供的默认主题对象也移植过来。
2.  **创建主题生成逻辑**：在插件中，创建一个函数，该函数读取 `theme.ts` 的主题对象和用户的配置（如果未来需要自定义），调用 `renderer-impl.ts` 中的 `buildTheme` 函数，生成 `styleMapping` 对象。

### 第 4 步：集成 Obsidian API

1.  **创建渲染视图 (`ItemView`)**：
    *   在 `main.ts` 中，注册一个新的 `ItemView` 类型。这个视图将作为渲染结果的展示面板。
    *   给这个视图一个唯一的 `id` 和一个易于识别的显示名称，例如 "MPEasy Preview"。
2.  **添加触发命令**：
    *   使用 `addCommand` API 添加一个名为 "MPEasy: 渲染并预览" 的命令。
    *   （可选）使用 `addRibbonIcon` API 在左侧边栏添加一个快捷图标，点击后执行该命令。
3.  **实现渲染流程**：
    *   当命令被触发时：
        a. 获取当前激活的 Markdown 编辑器内容: `this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.getValue()`。
        b. 调用我们移植的 `initRenderer` 函数，并传入主题配置，初始化一个渲染器实例。
        c. 调用渲染器的 `parseFrontMatterAndContent` 和 `marked.parse` 方法，将 Markdown 内容渲染成带内联样式的 HTML 字符串。
        d. 打开或激活我们的 `ItemView`，并将其内容设置为刚刚生成的 HTML 字符串。

### 第 5 步：实现复制功能

1.  **移植 `clipboard.ts`**：将 `refmd` 的 `clipboard.ts` 文件复制到 `mpeasy/src/utils/` 目录下。
2.  **在视图中添加按钮**：在 `ItemView` 的顶部或悬浮角落，创建一个“复制”按钮。
3.  **绑定复制事件**：
    *   为“复制”按钮添加点击事件监听器。
    *   在事件处理函数中，获取 `ItemView` 内部的 `innerHTML`（也就是渲染好的 HTML 字符串）。
    *   调用移植过来的 `copyHtml` 函数，将 `innerHTML` 作为参数传入。

## 3. 风险与对策

- **样式冲突**：虽然我们使用了内联样式，但 `refmd` 的某些基础样式或类名（如 `hljs`）可能会与 Obsidian 的内置样式冲突。
    - **对策**：在 `ItemView` 的根容器上使用一个唯一的 ID，并在所有非内联的 CSS 规则（例如 `styles.css` 中定义的）前加上这个 ID 作为前缀，以隔离样式作用域。
- **性能问题**：对于非常长的文档，`marked` 解析和 DOM 渲染可能会有延迟。
    - **对策**：在渲染开始时显示一个加载动画。对于超大文件，可以考虑将解析过程放入 Web Worker 中进行，以防阻塞 UI 线程（高级优化）。
- **依赖兼容性**：`refmd` 使用的某些 JS 库可能依赖浏览器环境的特定 API，而 Obsidian (基于 Electron) 的环境略有不同。
    - **对策**：在开发和测试阶段密切关注开发者控制台的报错信息，及时修复兼容性问题。

此方案完整地覆盖了从代码分析到具体实施的各个环节，通过关注核心的样式内联机制，确保了最终的复制效果能最大程度地还原 `refmd` 的原始体验。
