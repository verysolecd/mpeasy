# mpeasy 插件：功能移植与实现方案

## 1. 项目目标

将 `refmd` 的核心功能——Markdown 高保真渲染与复制，完美移植到 `mpeasy` Obsidian 插件中。并在此基础上，构建符合 Obsidian 使用习惯的设置页面和样式侧边栏。

## 2. 架构分析与技术选型

- **宿主环境**: Obsidian.md
- **主要语言**: TypeScript
- **UI 框架**: React (根据 `package.json` 分析)
- **核心渲染器**: `marked.js` (基于 `refmd` 的分析)
- **样式内联**: `juice`
- **代码高亮**: `highlight.js`
- **UI 样式**: TailwindCSS

项目当前 `src` 目录为空，因此我们将从零开始构建，这为我们设计清晰、现代的插件架构提供了绝佳机会。

## 3. 架构设计原则

在实施之前，我们确立以下核心架构原则，以确保插件的健壮性、可维护性和高性能。

- **高度解耦 (Decoupling)**:
    - **渲染器与 UI 彻底分离**: `MarkdownRenderer` 将是一个纯粹的、无状态的 TypeScript 类，它只负责接收文本和配置，然后返回 HTML。它不会依赖任何 Obsidian 或 React 的 API。
    - **独立的主题系统**: 定义清晰的 `Theme` 接口和 `ThemeManager`，使主题的增删和管理变得简单，无需改动核心代码。

- **性能优先 (Performance First)**:
    - **渲染防抖 (Debouncing)**: 用户的输入和样式调整不会立即触发渲染，而是会加入一个 300ms 的防抖延迟，确保只在用户停止操作后才执行，极大提升长文编辑时的流畅度。
    - **UI 优化**: 广泛使用 `React.memo`、`useCallback` 和 `useMemo` 来避免不必要的组件重渲染，保证样式面板和预览区域的响应速度。

- **可扩展性与可维护性 (Extensibility & Maintainability)**:
    - **清晰的职责划分**:
        - `src/main.ts`: **插件入口**，只负责与 Obsidian API 交互。
        - `src/view.ts`: **桥梁**，连接 Obsidian 视图系统与 React 组件。
        - `src/renderer/`: **数据处理层**，负责所有 Markdown 到 HTML 的转换逻辑。
        - `src/ui/`: **表现层**，包含所有 React 组件、Hooks 和样式。
        - `src/types/`: **定义层**，存放所有共享的 TypeScript 类型。
    - **Hooks 驱动**: 优先使用自定义 Hooks 封装可复用的逻辑，保持组件代码的整洁。
    - **严格类型**: 全程使用严格的 TypeScript，定义清晰的数据接口，减少运行时错误。

## 4. 实施方案

我们将围绕 Obsidian 插件的生命周期和 React 组件化思想来构建整个应用。

### 3.1. 核心渲染模块 (`src/renderer/`)

这是实现微信公众号样式渲染的核心，将与 UI 完全解耦。

- **`MarkdownRenderer.ts`**: 创建一个 `MarkdownRenderer` 类。
    - **构造函数**: 初始化 `marked` 实例，并使用 `marked.use()` 注册所有必要的扩展（如脚注、Katex、Mermaid 等）。
    - **`render(markdown: string, options: RenderOptions): string` 方法**:
        1.  接收 Markdown 原文和渲染选项（如主题、字体等）。
        2.  内部调用 `buildThemeStyles` 函数，根据选项动态生成内联样式对象。
        3.  **重写 `marked` 渲染器**: 在调用 `marked.parse()` 之前，动态传入一个重写后的 `renderer` 对象。此对象将拦截所有元素的渲染（如 `paragraph`, `heading`, `code`），并在生成 HTML 标签时，将上一步得到的样式字符串附加到 `style` 属性上。
        4.  返回包含第一阶段内联样式的 HTML 字符串。
- **`themes/` 目录**: 存放各个主题的 CSS 文件（如 `wechat.css`, `github.css`）。这些 CSS 将在复制前由 `juice` 库用于第二阶段的样式内联。
- **`types.ts`**: 定义 `RenderOptions` 和主题相关的类型。

### 3.2. 插件主入口 (`src/main.ts`)

作为 Obsidian 插件的起点，负责初始化和注册所有功能。

- **`MPEasyPlugin` 类 (继承 `Plugin`)**:
    - **`onload()`**:
        - 加载插件设置。
        - **注册视图**: 使用 `this.registerView()` 注册 `MPEasyRenderView`，使其可以在工作区中作为独立的面板存在。
        - **添加命令**: 使用 `this.addCommand()` 添加一个名为“渲染到公众号样式”的命令，其作用是激活并打开 `MPEasyRenderView`。
        - **添加设置页**: 使用 `this.addSettingTab()` 注册 `MPEasySettingTab`。
    - **`loadSettings()` / `saveSettings()`**: 负责插件配置的加载和保存。

### 3.3. 设置页面 (`src/settings.ts` & `src/ui/Settings.tsx`)

用于配置微信公众号相关的持久化设置。

- **`MPEasySettingTab.ts`**: 继承 Obsidian 的 `PluginSettingTab`。
    - 在 `display()` 方法中，使用 React-DOM 的 `createRoot` 将 `Settings.tsx` 组件挂载到 `containerEl` 上。
- **`Settings.tsx`**: 一个 React 组件。
    - 提供表单输入框，用于设置未来可能需要的公众号特定信息（例如，图片服务器配置、appid 等）。
    - 通过 props 接收 `plugin` 实例，并在用户修改设置时，调用 `plugin.saveSettings()` 进行保存。

### 3.4. 渲染视图与样式面板 (React Components)

这是用户直接交互的主界面，将作为一个独立的视图存在于 Obsidian 中。

- **`view.ts`**:
    - 创建 `MPEasyRenderView` 类，继承 `ItemView`。
    - 在 `onOpen()` 方法中，初始化 React 环境，并将 `RenderContainer.tsx` 组件挂载到视图的根 DOM 元素上。
    - 在 `onClose()` 方法中，卸载 React 组件。
- **`ui/RenderContainer.tsx`**:
    - 作为渲染视图的父组件，负责管理整个视图的状态。
    - **State**: `markdownContent`, `renderedHtml`, `styleOptions`。
    - **Effect**: 监听当前激活的笔记，当笔记内容改变时，自动更新 `markdownContent` 状态，并调用核心渲染器重新生成 `renderedHtml`。
    - **布局**: 左右分栏布局，左侧为 `Preview.tsx`，右侧为 `StylePanel.tsx`。
- **`ui/Preview.tsx`**:
    - **Props**: `html: string`。
    - 使用 `dangerouslySetInnerHTML` 将渲染后的 HTML 字符串展示出来。
    - 包含一个“复制”按钮。点击后，调用一个 `copyHandler` 函数。
    - **`copyHandler`**:
        1.  获取当前 `Preview` 组件内的 HTML。
        2.  使用 `juice` 将主题 CSS 与 HTML 进行合并，完成第二阶段的样式内联。
        3.  使用 `navigator.clipboard.write()` API 将最终的、完全内联的 HTML 写入剪贴板。
- **`ui/StylePanel.tsx`**:
    - **Props**: `options: StyleOptions`, `setOptions: (options: StyleOptions) => void`。
    - 提供一系列 UI 控件（下拉框、开关、输入框），用于实时调整渲染选项，如：
        - 主题选择 (Theme)
        - 字体选择 (Font Family)
        - 字号调整 (Font Size)
    - 当用户修改选项时，调用 `setOptions` 更新父组件的状态，从而触发重新渲染。

## 4. 开发步骤

1.  **环境搭建**: 运行 `npm install` 安装所有 `package.json` 中声明的依赖。
2.  **创建文件结构**: 根据上述方案，在 `src` 目录下创建 `main.ts`, `view.ts`, `settings.ts` 以及 `renderer/` 和 `ui/` 目录。
3.  **实现设置页面**: 首先完成 `Settings.tsx` 和 `MPEasySettingTab` 的开发，确保插件配置可以被正确保存和读取。
4.  **实现核心渲染器**: 开发 `MarkdownRenderer.ts`，实现第一阶段的样式内联。可以先用一个固定的主题进行测试。
5.  **实现渲染视图**: 开发 `MPEasyRenderView` 和相关的 React 组件 (`RenderContainer`, `Preview`, `StylePanel`)。
    - 重点是打通 "Obsidian -> React" 的数据流：笔记内容变化 -> `RenderContainer` 状态更新 -> `MarkdownRenderer` 执行 -> `Preview` 显示。
    - 以及 "React -> React" 的数据流：`StylePanel` 修改选项 -> `RenderContainer` 状态更新 -> `MarkdownRenderer` 使用新选项重新执行 -> `Preview` 更新。
6.  **实现复制功能**: 在 `Preview.tsx` 中实现 `copyHandler`，集成 `juice` 完成最终的 HTML 复制功能。
7.  **联调与测试**: 在 Obsidian 开发模式下，反复测试渲染效果、样式调整的实时性以及复制到微信公众号编辑器的最终效果。
