当前项目中CSS的注入实现机制。

CSS的注入主要发生在 src/components/MPEasyViewComponent.tsx 这个核心组件中，并且分为两种场景：实时预览 和 复制/上传。

1. 实时预览中的CSS注入
这是你在界面上看到的实时效果，它的CSS注入流程如下：

收集CSS源：

主题文件：根据你在UI界面选择的“排版主题”、“代码块主题”和“自定义样式”，程序会通过 getCachedCss 函数去读取对应的CSS文件内容。
功能性CSS：如果勾选了“首行缩进”，程序会额外加载 indent.css 文件。
用户自定义CSS：包括你在插件设置中保存的“自定义CSS”和在预览界面右侧实时编辑的CSS。
加载与缓存：

loadCssContent 函数负责从插件的 assets 目录中读取具体的CSS文件。
为了提高性能，所有读取过的CSS文件内容都会被缓存起来，避免重复读取。
组合与注入：

所有从文件和设置中获取的CSS字符串会被合并成一个大的CSS块。
这个整合后的CSS块，连同渲染出的HTML内容，被一起填入一个<iframe>（即你看到的预览区域）的srcdoc属性中。
在<iframe>的HTML结构里，每一部分CSS都被包裹在各自的<style>标签内，并拥有独立的id（如 mpe-layout-theme, mpe-code-theme等），最终被浏览器渲染，形成你看到的预览效果。
<!-- 预览iframe的简化结构 -->
<html>
  <head>
    ...
    <style id="mpe-layout-theme">/* 排版主题CSS */</style>
    <style id="mpe-code-theme">/* 代码块主题CSS */</style>
    <style id="mpe-indent-style">/* 缩进CSS */</style>
    ...
  </head>
  <body>
    <!-- 渲染后的HTML内容 -->
  </body>
</html>
2. 复制/上传时的CSS注入 (内联化)
当你点击“复制”或“上传”时，为了确保样式在微信公众号等外部平台正常显示，需要将所有CSS规则转换为内联样式（inline style）。

获取HTML和CSS：

此过程与实时预览的第一步类似，同样会收集所有相关的CSS。
同时，程序会获取渲染出的HTML内容。
使用juice库进行CSS内联：

这是最关键的一步。项目使用了一个名为 juice 的第三方库。
juice 会将所有<style>标签中的CSS规则，精确地计算并应用到每一个HTML元素（如<h1>, <p>等）的style属性上。
例如，它会把一条CSS规则 .mpe-paragraph { color: red; } 转换成 <p class="mpe-paragraph" style="color: red;">...</p>。
创建沙箱环境：

为了执行juice，程序会临时在页面上创建一个不可见的<iframe>作为沙箱。
在这个沙箱里加载HTML和所有CSS，待浏览器渲染完毕后，juice开始工作，将所有计算后的样式内联到HTML标签中。
输出最终结果：

juice处理完成后，程序会提取出被“注入”了内联样式的HTML内容。
这份包含了所有样式的HTML就是最终被复制到剪贴板或上传到服务器的内容。这个过程保证了即使外部平台不支持<style>标签，样式也能完整保留。
总结： 该插件实现了一套相当完善的CSS注入方案：在预览时，通过注入<style>标签实现快速、动态的样式更新；在输出时，通过juice库将CSS内联化，以确保最佳的跨平台兼容性。