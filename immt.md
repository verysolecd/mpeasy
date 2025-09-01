# `refmd` 功能移植到 Obsidian (React) 详细方案

## 1. 总体目标

将 `refmd` 的核心功能（高质量 Markdown 渲染、样式控制、复制到公众号、图片上传）从 Vue 技术栈移植到 `mpeasy` 这个 Obsidian 插件中，并使用 **React** 作为前端框架。同时，利用 Obsidian 的插件 API 实现与保险库文件和设置的深度集成。

## 2. 核心技术选型

- **UI 框架**: **React** (搭配 ReactDOM)
- **构建工具**: 沿用当前插件的 `esbuild`。
- **Markdown 解析**: **`marked`** 或 **`markdown-it`**。两者都性能优秀且插件丰富，`markdown-it` 在插件化方面更灵活。
- **代码高亮**: **`highlight.js`**，与 `refmd` 保持一致。
- **数学公式**: **`katex`**，Obsidian 自身也使用它，可以保持一致体验。
- **图表/Mermaid**: **`mermaid.js`**。
- **CSS 内联**: **`juice`**，这是保证复制到公众号功能的核心，必须引入。
- **HTTP 请求**: Obsidian 内置的 `requestUrl` 或引入 **`axios`**。
- **UI 组件库**: **Radix UI (React 版)** 配合 **Tailwind CSS**，可以快速构建出类似 `refmd` 的现代化、可访问性强的 UI。

---

## 3. 详细实施步骤

### 步骤一：创建隔离的渲染视图 (Render View)

**需求**: 在 Obsidian 中实现 MD 渲染，并使用 Shadow DOM 隔离 CSS。

1.  **创建 Obsidian ItemView**:
    - 在 `main.ts` 中，注册一个新的 `ItemView` 类型，例如 `MPEASY_VIEW_TYPE`。这个 View 将作为我们 React 应用的挂载容器。
    - 添加一个 Ribbon Icon（左侧栏图标）或命令，用于打开这个新的渲染视图。当用户点击时，打开一个 `MPEASY_VIEW_TYPE` 的新标签页。

2.  **集成 React 和 Shadow DOM**:
    - 在 `MPEASY_VIEW_TYPE` 的 `onOpen` 方法中，获取到视图的容器元素 `this.containerEl.children[1]`。
    - **创建 Shadow DOM**: 调用 `container.attachShadow({ mode: 'open' })` 来创建一个 Shadow Root。这将是 React 应用的根节点，能有效隔离所有外部 CSS（包括 Obsidian 主题）的影响。
    - **创建 React 根**: 创建一个新的 `div` 元素，附加到 Shadow Root 上，然后使用 `ReactDOM.createRoot(shadowDiv).render(<App />)` 来挂载你的主 React 组件。

3.  **实现 Markdown 渲染组件**:
    - 创建一个名为 `Preview` 的 React 组件。
    - 它接收 Markdown 文本作为 `prop`。
    - 在组件内部，使用 `marked` 和 `highlight.js` 将 Markdown 文本转换为 HTML 字符串。
    - 为了安全，使用 `DOMPurify` 清理生成的 HTML，防止 XSS 攻击。
    - 使用 `dangerouslySetInnerHTML` 将清理后的 HTML 渲染到组件中。
    - **加载样式**: 在 Shadow DOM 内部，通过 `<link>` 或 `<style>` 标签引入 `refmd` 的主题 CSS、`highlight.js` 的代码高亮 CSS 以及自定义 CSS。这些 CSS 文件可以先放在插件的静态资源目录下。



### 步骤二：实现样式控制面板

**需求**: 创建一个类似 `refmd` 的面板，用于动态控制文章样式。

1.  **创建 `StylePanel` 组件**:
    - 包含用于调整字体、字号、颜色、边距、主题等的 UI 控件（如 `select` 下拉框、`slider` 滑块）。
    - 使用 React Context 或状态管理库（如 Zustand）来创建一个全局的样式状态 `styleStore`。

2.  **动态应用样式**:
    - `StylePanel` 中的控件修改 `styleStore` 中的状态。
    - `Preview` 组件消费 `styleStore` 中的状态。
    - **实现方式**:
        - **CSS 变量**: 在 Shadow DOM 的根上，根据 `styleStore` 的状态动态设置 CSS 变量（例如 `:host { --font-size: 16px; }`）。主题 CSS 文件则使用这些变量。这是最现代和高效的方式。
        - **动态类名**: 根据状态切换根元素上的 class（例如 `className="theme-dark"`）。

### 步骤三：创建插件设置页面

**需求**: 实现一个设置页面，用于配置公众号信息和自定义 CSS。

1.  **创建 `SettingTab`**:
    - 在 `main.ts` 中，创建一个继承自 `PluginSettingTab` 的类。
    - 在 `display()` 方法中，使用 `new Setting(containerEl)` 来创建各个设置项。

2.  **实现设置项**:
    - **文本输入**: 为 `公众号ID (appId)`、`公众号密钥 (appSecret)` 和 `wxtoken` 创建文本输入框。
    - **自定义 CSS 开关**: 创建一个 `ToggleComponent`，用于启用或禁用自定义 CSS。
    - **CSS 文件选择器**:
        a. 创建一个 `DropdownComponent`。
        b. 使用 `app.vault.getFiles()` 找到保险库中所有的 `.css` 文件。
        c. 将这些 CSS 文件的路径填充到下拉框的选项中。

3.  **保存与加载设置**:
    - 将所有设置项保存在 `mpeasy` 插件的 `settings` 对象中。
    - 使用 `this.plugin.saveSettings()` 在用户修改设置后进行持久化。
    - 在插件加载时，`loadSettings()` 会恢复这些配置。
    - 在渲染视图和上传功能中，从 `this.plugin.settings` 读取这些配置来使用。

---

### 步骤四：实现复制与上传功能

**需求**: 实现“复制到公众号”和“上传草稿”功能，包括图片处理。

1.  **创建控制面板 (Control Panel)**:
    - 创建一个 `ControlPanel` React 组件，包含“复制HTML”、“上传草稿”等按钮。

2.  **实现“复制HTML”功能**:
    - 当用户点击按钮时，触发一个函数，该函数：
        a. 获取 `Preview` 组件渲染出的 HTML 内容。
        b. **动态获取 CSS**: 编写一个函数，通过遍历 Shadow DOM 内的 `<style>` 和 `<link>` 标签，获取所有生效的 CSS 文本。
        c. **调用 `juice`**: 将 HTML 内容和 CSS 文本传入 `juice()` 函数，生成内联样式的 HTML。
        d. **写入剪贴板**: 使用 `navigator.clipboard.writeText()` 将内联后的 HTML 写入剪贴板。
        e. 给出操作成功的提示（例如用 `react-hot-toast`）。

3.  **实现“上传草稿”与图片处理**:
    - **图片链接处理**: 这是最复杂的部分。在 `marked` 将 Markdown 转换为 HTML 的过程中，需要提供一个自定义的 `renderer` 来重写图片 (`image`) 的渲染逻辑。
        - **网络图片**: 如果图片 `src` 是 `http(s)://` 开头，直接保留。
        - **本地图片**: 如果是 Obsidian 的本地图片（例如 `app://...` 或相对路径），则需要特殊处理：
            i.  **获取图片数据**: 使用 Obsidian 的 `app.vault.adapter.readBinary(path)` API 读取图片文件的二进制数据。
            ii. **上传到微信**: 调用微信公众号的“上传图文消息内的图片”接口，将二进制数据上传，换取一个微信服务器上的永久 URL。**这需要后端代理**，因为微信 API 有跨域限制且需要保密 `access_token`。一个简单的 Netlify/Vercel Serverless Function 或自建服务器均可。
            iii. **替换 URL**: 将 HTML 中的本地图片 `src` 替换为从微信服务器返回的 URL。
    - **上传文章**:
        a. 所有图片处理完毕后，得到最终的 HTML。
        b. 调用微信公众号的“新增永久图文素材”或“发布”接口，将标题、作者、HTML 内容等一并上传。

## 5. 初始文件结构建议

```
mpeasy/
├── main.ts               # 插件主入口
├── manifest.json
├── package.json
├── tsconfig.json
└── src/
    ├── components/         # React UI 组件 (Preview, StylePanel, ControlPanel...)
    ├── hooks/              # 自定义 React Hooks
    ├── styles/             # 存放 refmd 主题、代码高亮等 CSS 文件
    ├── stores/             # 状态管理 (Zustand/Context)
    ├── types/              # 类型定义
    ├── utils/              # 工具函数 (CSS 获取, API 请求等)
    ├── view.tsx            # React 应用的根组件和渲染逻辑
    └── obsidian/
        ├── settingTab.ts   # 设置页面实现
        └── view.ts         # Obsidian ItemView 实现
```

这个方案提供了一个清晰的、分阶段的实施路径。建议从**步骤一**开始，先搭建起基本的渲染和隔离环境，然后再逐步实现其他复杂功能。
