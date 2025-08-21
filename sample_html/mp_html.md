<section class="mpeasy-container theme-light ">
      <blockquote class="mpe-blockquote">
        <p class="mpe-paragraph mpe-blockquote-paragraph">字数 1426，阅读大约需 8 分钟</p>
      </blockquote>
    <p class="mpe-paragraph">Markdown 是一种轻量级标记语言，用于格式化纯文本。它以简单、直观的语法而著称，可以快速地生成 HTML。Markdown 是写作与代码的完美结合，既简单又强大。</p><h2 class="mpe-heading mpe-heading-2" data-heading="true">Markdown 基础语法</h2><h3 class="mpe-heading mpe-heading-3" data-heading="true">1. 标题：让你的内容层次分明</h3><h1 class="mpe-heading mpe-heading-1" data-heading="true">一级标题</h1><h2 class="mpe-heading mpe-heading-2" data-heading="true">二级标题</h2><h3 class="mpe-heading mpe-heading-3" data-heading="true">三级标题</h3><h4 class="mpe-heading mpe-heading-4" data-heading="true">四级标题</h4><h5 class="mpe-heading mpe-heading-5" data-heading="true">我是五极标题</h5><h2 class="mpe-heading mpe-heading-2" data-heading="true">我是代码</h2><pre class="hljs mpe-code-pre language-plaintext mac-style"> <div class="mpe-code-header"><span class="mac-sign" style="padding: 10px 14px 0;"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130"> <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" /> <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" /> <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" /> </svg></span></div> <code class="language-plaintext">export&nbsp;class&nbsp;CardDataManager&nbsp;{<br/>&nbsp;&nbsp;&nbsp;&nbsp;private&nbsp;cardData:&nbsp;Map&lt;string,&nbsp;string&gt;;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;private&nbsp;static&nbsp;instance:&nbsp;CardDataManager;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;private&nbsp;constructor()&nbsp;{&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;this.cardData&nbsp;=&nbsp;new&nbsp;Map&lt;string,&nbsp;string&gt;();&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;}&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;静态方法，用于获取实例<br/>&nbsp;&nbsp;&nbsp;&nbsp;public&nbsp;static&nbsp;getInstance():&nbsp;CardDataManager&nbsp;{&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if&nbsp;(!CardDataManager.instance)&nbsp;{&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CardDataManager.instance&nbsp;=&nbsp;new&nbsp;CardDataManager();&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return&nbsp;CardDataManager.instance;<br/>&nbsp;&nbsp;&nbsp;&nbsp;}&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;public&nbsp;setCardData(id:&nbsp;string,&nbsp;cardData:&nbsp;string)&nbsp;{&nbsp;&nbsp;&nbsp;&nbsp;<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;this.cardData.set(id,&nbsp;cardData);<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>&nbsp;&nbsp;&nbsp;&nbsp;public&nbsp;cleanup()&nbsp;</code> </pre><h2 class="mpe-heading mpe-heading-2" data-heading="true">3. 字体样式：强调你的文字</h2><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <strong class="mpe-strong">粗体</strong>：用两个星号或下划线包裹文字，如 <code class="mpe-codespan">**粗体**</code> 或 <code class="mpe-codespan">__粗体__</code>。</li><li class="mpe-list-item">• <em class="mpe-em">斜体</em>：用一个星号或下划线包裹文字，如 <code class="mpe-codespan">*斜体*</code> 或 <code class="mpe-codespan">_斜体_</code>。</li><li class="mpe-list-item">• <del>删除线</del>：用两个波浪线包裹文字，如 <code class="mpe-codespan">~~删除线~~</code>。</li></ul><p class="mpe-paragraph">这些简单的标记可以让你的内容更有层次感和重点突出。</p><h3 class="mpe-heading mpe-heading-3" data-heading="true">4. 列表：整洁有序</h3><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <strong class="mpe-strong">无序列表</strong>：用 <code class="mpe-codespan">-</code>、<code class="mpe-codespan">*</code> 或 <code class="mpe-codespan">+</code> 加空格开始一行。</li><li class="mpe-list-item">• <strong class="mpe-strong">有序列表</strong>：使用数字加点号（<code class="mpe-codespan">1.</code>、<code class="mpe-codespan">2.</code>）开始一行。</li></ul><p class="mpe-paragraph">在列表中嵌套其他内容？只需缩进即可实现嵌套效果。</p><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• 无序列表项 1<ol class="mpe-list mpe-list-ordered"><li class="mpe-list-item">1. 嵌套有序列表项 1</li><li class="mpe-list-item">2. 嵌套有序列表项 2</li></ol></li><li class="mpe-list-item">• 无序列表项 2</li></ul><ol class="mpe-list mpe-list-ordered"><li class="mpe-list-item">1. 有序列表项 1</li><li class="mpe-list-item">2. 有序列表项 2</li></ol><h3 class="mpe-heading mpe-heading-3" data-heading="true">5. 链接与图片：丰富内容</h3><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <strong class="mpe-strong">链接</strong>：用方括号和圆括号创建链接 <code class="mpe-codespan">[显示文本](链接地址)</code>。</li><li class="mpe-list-item">• <strong class="mpe-strong">图片</strong>：和链接类似，只需在前面加上 <code class="mpe-codespan">!</code>，如 <code class="mpe-codespan">![描述文本](图片链接)</code>。</li></ul><h4 class="mpe-heading mpe-heading-4" data-heading="true">本地图片</h4><figure class="mpe-figure"><img class="mpe-image" src="_Assets/WXWorkCapture_17557409152543.png" title="null" alt=""/></figure><h4 class="mpe-heading mpe-heading-4" data-heading="true">网络图片</h4><figure class="mpe-figure"><img class="mpe-image" src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/logo-2.png" title="null" alt="doocs"/></figure>
            <section style="box-sizing: border-box; font-size: 16px;">
              <section data-role="outer" style="font-family: 微软雅黑; font-size: 16px;">
                <section data-role="paragraph" style="margin: 0px auto; box-sizing: border-box; width: 100%;">
                  <section style="margin: 0px auto; text-align: center;">
                    <section style="display: inline-block; width: 100%;">
                      <section style="overflow-x: scroll; -webkit-overflow-scrolling: touch; white-space: nowrap; width: 100%; text-align: center;">
                        <section style="display: inline-block; width: 100%; margin-right: 0; vertical-align: top;">
                          <img src="_Assets/Pasted%20image%2020250103134935.png" alt="alt" title="alt" style="; width: 100%; height: auto; border-radius: 4px; vertical-align: top;"/>
                          <p style="margin-top: 5px; font-size: 14px; color: #666; text-align: center; white-space: normal;">alt</p>
                        </section><section style="display: inline-block; width: 100%; margin-right: 0; vertical-align: top;">
                          <img src="https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/gh/doocs/md/images/logo-2.png" alt="alt" title="alt" style="; width: 100%; height: auto; border-radius: 4px; vertical-align: top;"/>
                          <p style="margin-top: 5px; font-size: 14px; color: #666; text-align: center; white-space: normal;">alt</p>
                        </section>
                      </section>
                    </section>
                  </section>
                </section>
              </section>
              <p style="font-size: 14px; color: #999; text-align: center; margin-top: 5px;"><<< 左右滑动看更多 >>></p>
            </section>
          <blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">因微信公众号平台不支持除公众号内容以外的链接，故其他平台的链接，会呈现链接样式但无法点击跳转。</p></blockquote><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">对于这些链接请注意明文书写，或点击左上角「格式-&gt;微信外链接转底部引用」开启引用，这样就可以在底部观察到链接指向。</p></blockquote><p class="mpe-paragraph">另外，使用 <code class="mpe-codespan">&lt;![alt](url),![alt](url)&gt;</code> 语法可以创建横屏滑动幻灯片，支持微信公众号平台。建议使用相似尺寸的图片以获得最佳显示效果。</p><h3 class="mpe-heading mpe-heading-3" data-heading="true">6. 引用：引用名言或引人深思的句子</h3><p class="mpe-paragraph">使用 <code class="mpe-codespan">&gt;</code> 来创建引用，只需在文本前面加上它。多层引用？在前一层 <code class="mpe-codespan">&gt;</code> 后再加一个就行。</p><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">这是一个引用</p><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">这是一个嵌套引用</p></blockquote></blockquote><p class="mpe-paragraph">这让你的引用更加富有层次感。</p><h3 class="mpe-heading mpe-heading-3" data-heading="true">7. 代码块：展示你的代码</h3><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <strong class="mpe-strong">行内代码</strong>：用反引号包裹，如 <code class="mpe-codespan">code</code>。</li><li class="mpe-list-item">• <strong class="mpe-strong">代码块</strong>：用三个反引号包裹，并指定语言，如：</li><li class="mpe-list-item">• </li></ul><pre class="hljs mpe-code-pre language-js mac-style"> <div class="mpe-code-header"><span class="mac-sign" style="padding: 10px 14px 0;"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130"> <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" /> <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" /> <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" /> </svg></span></div> <code class="language-js"><span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(<span class="hljs-string">&quot;Hello,&nbsp;Doocs!&quot;</span>);</code> </pre><pre class="hljs mpe-code-pre language-plaintext mac-style"> <div class="mpe-code-header"><span class="mac-sign" style="padding: 10px 14px 0;"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130"> <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" /> <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" /> <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" /> </svg></span></div> <code class="language-plaintext">这是note</code> </pre><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">[!IMPORTANT]<br>重要提示</p></blockquote><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">[!IMPORTANT]<br> 这是一个重要的警告框。</p></blockquote><h3 class="mpe-heading mpe-heading-3" data-heading="true">8. 分割线：分割内容</h3><p class="mpe-paragraph">用三个或更多的 <code class="mpe-codespan">-</code>、<code class="mpe-codespan">*</code> 或 <code class="mpe-codespan">_</code> 来创建分割线。</p><hr class="mpe-hr"/><p class="mpe-paragraph">为你的内容添加视觉分隔。</p><h3 class="mpe-heading mpe-heading-3" data-heading="true">9. 表格：清晰展示数据</h3><p class="mpe-paragraph">Markdown 支持简单的表格，用 <code class="mpe-codespan">|</code> 和 <code class="mpe-codespan">-</code> 分隔单元格和表头。</p>
        <section class="mpe-table-wrapper">
          <table class="mpe-table">
            <thead class="mpe-table-header"><th class="mpe-table-header-cell">项目人员</th><th class="mpe-table-header-cell">邮箱</th><th class="mpe-table-header-cell">微信号</th></thead>
            <tbody class="mpe-table-body"><tr class="mpe-table-row"><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">yanglbme<sup>[1]</sup></span></td><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">contact@yanglibin.info<sup>[2]</sup></span></td><td class="mpe-table-cell">YLB0109</td></tr><tr class="mpe-table-row"><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">YangFong<sup>[3]</sup></span></td><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">yangfong2022@gmail.com<sup>[4]</sup></span></td><td class="mpe-table-cell">yq2419731931</td></tr><tr class="mpe-table-row"><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">thinkasany<sup>[5]</sup></span></td><td class="mpe-table-cell"><span class="mpe-link mpe-link-cite">thinkasany@gmail.com<sup>[6]</sup></span></td><td class="mpe-table-cell">thinkasany</td></tr></tbody>
          </table>
        </section>
      <p class="mpe-paragraph">这样的表格让数据展示更为清爽！</p><h2 class="mpe-heading mpe-heading-2" data-heading="true">Markdown 进阶</h2><h3 class="mpe-heading mpe-heading-3" data-heading="true">1. LaTeX 公式：完美展示数学表达式</h3><p class="mpe-paragraph">Markdown 允许嵌入 LaTeX 语法展示数学公式：</p><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <strong class="mpe-strong">行内公式</strong>：用 <code class="mpe-codespan">$</code> 包裹公式，如  $E = mc^2$.</li><li class="mpe-list-item">• <strong class="mpe-strong">块级公式</strong>：用 <code class="mpe-codespan">$$</code> 包裹公式：</li></ul><p class="mpe-paragraph">$$<br>\begin{aligned}<br>d_{i, j} &amp;\leftarrow d_{i, j} + 1 \<br>d_{i, y + 1} &amp;\leftarrow d_{i, y + 1} - 1 \<br>d_{x + 1, j} &amp;\leftarrow d_{x + 1, j} - 1 \<br>d_{x + 1, y + 1} &amp;\leftarrow d_{x + 1, y + 1} + 1<br>\end{aligned}<br>$$ </p><ol class="mpe-list mpe-list-ordered"><li class="mpe-list-item">1. 列表内块公式 1</li></ol><p class="mpe-paragraph">  $$<br>  \chi^2 = \sum \frac{(O - E)^2}{E}<br>  $$</p><ol class="mpe-list mpe-list-ordered"><li class="mpe-list-item">2. 列表内块公式 2</li></ol><p class="mpe-paragraph">  $$<br>  \chi^2 = \sum \frac{(|O - E| - 0.5)^2}{E}<br>  $$</p><p class="mpe-paragraph">这是展示复杂数学表达的利器！</p><h3 class="mpe-heading mpe-heading-3" data-heading="true">2. Mermaid 流程图：可视化流程</h3><p class="mpe-paragraph">Mermaid 是强大的可视化工具，可以在 Markdown 中创建流程图、时序图等。</p><pre class="mermaid">graph LR
  A[GraphCommand] --> B[update]
  A --> C[goto]
  A --> D[send]  
  B --> B1[更新状态]
  C --> C1[流程控制]
  D --> D1[消息传递]</pre><pre class="mermaid">graph TD;
  A-->B;
  A-->C;
  B-->D;
  C-->D;</pre><pre class="mermaid">pie
  title Key elements in Product X
  "Calcium" : 42.96
  "Potassium" : 50.05
  "Magnesium" : 10.01
  "Iron" : 5</pre><pre class="mermaid">pie
  title 为什么总是宅在家里？
  "喜欢宅" : 45
  "天气太热" : 70
  "穷" : 500
  "没人约" : 95</pre><p class="mpe-paragraph">这种方式不仅能直观展示流程，还能提升文档的专业性。</p><blockquote class="mpe-blockquote"><p class="mpe-paragraph mpe-blockquote-paragraph">更多用法，参见：<span class="mpe-link mpe-link-cite">Mermaid User Guide<sup>[7]</sup></span>。</p></blockquote><h2 class="mpe-heading mpe-heading-2" data-heading="true">结语</h2><p class="mpe-paragraph">Markdown 是一种简单、强大且易于掌握的标记语言，通过学习基础和进阶语法，你可以快速创作内容并有效传达信息。无论是技术文档、个人博客还是项目说明，Markdown 都是你的得力助手。希望这篇内容能够带你全面了解 Markdown 的潜力，让你的写作更加丰富多彩！</p><p class="mpe-paragraph">现在，拿起 Markdown 编辑器，开始创作吧！探索 Markdown 的世界，你会发现它远比想象中更精彩！</p><h4 class="mpe-heading mpe-heading-4" data-heading="true">推荐阅读</h4><ul class="mpe-list mpe-list-unordered"><li class="mpe-list-item">• <a class="mpe-link mpe-link-wx" href="https://mp.weixin.qq.com/s/RNKDCK2KoyeuMeEs6GUrow" title="阿里又一个 20k+ stars 开源项目诞生，恭喜 fastjson！">阿里又一个 20k+ stars 开源项目诞生，恭喜 fastjson！</a></li><li class="mpe-list-item">• <a class="mpe-link mpe-link-wx" href="https://mp.weixin.qq.com/s/rjGqxUvrEqJNlo09GrT1Dw" title="刷掉 90% 候选人的互联网大厂海量数据面试题（附题解 + 方法总结）">刷掉 90% 候选人的互联网大厂海量数据面试题（附题解 + 方法总结）</a></li><li class="mpe-list-item">• <a class="mpe-link mpe-link-wx" href="https://mp.weixin.qq.com/s/kalGv5T8AZGxTnLHr2wDsA" title="好用！期待已久的文本块功能究竟如何在 Java 13 中发挥作用？">好用！期待已久的文本块功能究竟如何在 Java 13 中发挥作用？</a></li><li class="mpe-list-item">• <a class="mpe-link mpe-link-wx" href="https://mp.weixin.qq.com/s/_q812aGD1b9QvZ2WFI0Qgw" title="2019 GitHub 开源贡献排行榜新鲜出炉！微软谷歌领头，阿里跻身前 12！">2019 GitHub 开源贡献排行榜新鲜出炉！微软谷歌领头，阿里跻身前 12！</a></li></ul><hr class="mpe-hr"/><h4 class="mpe-heading mpe-heading-4">引用链接</h4><p class="mpe-paragraph mpe-footnotes"><code class="mpe-codespan">[1]</code> yanglbme: <i style="word-break: break-all">https://github.com/yanglbme</i><br/>
<code class="mpe-codespan">[2]</code> contact@yanglibin.info: <i style="word-break: break-all">mailto:contact@yanglibin.info</i><br/>
<code class="mpe-codespan">[3]</code> YangFong: <i style="word-break: break-all">https://github.com/YangFong</i><br/>
<code class="mpe-codespan">[4]</code> yangfong2022@gmail.com: <i style="word-break: break-all">mailto:yangfong2022@gmail.com</i><br/>
<code class="mpe-codespan">[5]</code> thinkasany: <i style="word-break: break-all">https://github.com/thinkasany</i><br/>
<code class="mpe-codespan">[6]</code> thinkasany@gmail.com: <i style="word-break: break-all">mailto:thinkasany@gmail.com</i><br/>
<code class="mpe-codespan">[7]</code> Mermaid User Guide: <i style="word-break: break-all">https://mermaid.js.org/intro/getting-started.html</i><br/></p>
    <style>
      .preview-wrapper pre::before {
        position: absolute;
        top: 0;
        right: 0;
        color: #ccc;
        text-align: center;
        font-size: 0.8em;
        padding: 5px 10px 0;
        line-height: 15px;
        height: 15px;
        font-weight: 600;
      }
    </style>
  <style>:root {
    --mpe-font-size: 16px;
    --mpe-primary-color: #007bff;
    --mpe-text-indent: 0;
  }

  /* Custom CSS from settings */
  

  /* Custom Code Block CSS from settings */
  
  </style>
        <style>
          .hljs.mpe-code-pre > .mac-sign {
            display: flex;
          }
        </style>
      
    <style>
      .mpe-code-pre {
        padding: 0 !important;
        border-radius: 6px;
        margin: 1em 0;
      }

      .hljs.mpe-code-pre code {
        display: -webkit-box;
        padding: 20px;
        overflow-x: auto;
        text-indent: 0;
      }
      h2.mpe-heading strong.mpe-strong {
        color: inherit !important;
      }
      
    </style>
  </section>