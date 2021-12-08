TextBus 中文指南
================================

本文介绍了 TextBus 设计理念及各种概念，以及它们之间的关联关系，以帮助你能快的对 TextBus 有一个整体的了解，可以更轻松的使用 TextBus 的各种功能。


## 简介

TextBus 并不是一个一体化的编辑器，而是提供了成套的技术方案，旨在解决富文本开发中容易掉入各种样式、标签及光标计算的陷阱。使用 TextBus，你基本无需再关心标签如何嵌套，光标位置保持的问题，也不必关心编辑内容生成的代码质量问题。

TextBus 通过抽象的组件（Component）、内容（Content）和格式（formatter）组成基本数据结构，你完全掌控这些数据的变化，你也完全可以预期这些数据的渲染结果。同时，得益于 TextBus 高效的渲染器（Renderer），对于超长文档，或者复杂组件，你总是能得到几乎 1ms 内的视图更新效率，同时生成最干净的富文本内容。你也可以像平常使用前端开发框架一样，在组件内添加事件监听，并做出优秀交互效果。还可以根据不同的渲染上下文，在编辑时和输出时，生成不一样的富文本内容。甚至，你可以生成 Vue 或 Angular 的模板代码，作为低代码平台的源数据。

总之，限制你的是你的想象力！

TextBus 目前有三个模块，它们分别是：

+ **core** 核心模块，提供了 TextBus 文档的基本数据模型、操作、渲染，以及状态查询、选区、数据转换、历史记录等；
+ **browser** 浏览器支持模块，提供了 PC 端编辑器的视图层，如选区、HTML 解析、光标及文本输入等；
+ **editor** TextBus 官方实现的 PC 端富文本编辑器，提供了大多数富文本所需的功能。


## 基本概念

数据结构：

+ **Component 组件** 和前端框架一样，组件是由特定的结构和交互的代码块，组件内也可以有零到多个 slot（插槽），组件也可以有自己的方法，来完成自身的数据交互；
+ **Slot 插槽** 表示组件内可以动态插入内容的位置，在 TextBus 中，表示这一块的内容是可以编辑的，用户可以通过操作来修改里面的内容；
+ **Formatter 格式** 表示对文本的修饰，如加粗、字体颜色等；
+ **ContentType 内容类型** 分别为：BlockComponent（块组件）、InlineComponent（行内组件）、Text（文本）；
+ **VElement 虚拟无素节点** TextBus 渲染组件或格式时，虚拟 DOM 树元素节点；
+ **VTextNode 虚拟文本节点** TextBus 渲染文本时，虚拟 DOM 树文本节点。

数据操作：

+ **Commander 命令** 对文档进行修改操作的简洁方法；
+ **TBSelection 选区** 当前选择的区域（大多数情况为用户拖蓝的区域）；
+ **Query 查询** 根据组件或格式查询在文档选区的中状态；
+ **Renderer 渲染器** 用于渲染文档的核心类，可通过渲染器获取到直实 ；DOM 节点，虚拟 DOM 节点，以及数据之间的映射关系；
+ **History 历史记录** 用于记录用户操作，并提供前进，后退操作；
+ **Translator 数据转换器** 用于把 JSON 数据转换为 TextBus 数据结构的工具类。


## 创建第一个编辑器

在 html 中准备好一个容器。

```html
<div id="editor"></div>
```
导入 Editor 类，并实例化。
```ts
import { Editor } from '@textbus/editor'

const editor = new Editor('#editor')
```

至此，我们就创建了一个只有少量功能的基础的编辑器。

> 之所以说有少量功能，是因为 `Editor` 默认包含了根组件，根组件内有引用段落组件，从而让你有最基本的文字及段落编辑能力，这是 @textbus/editor 这个包中封装好的能力。
> 
> 如果你想完全自定义编辑器的行为，则可以引用 @textbus/browser 中的 `CoreEditor` 类来创建编辑器。或者在实例化 `Editor` 时，在配置项中传入根组件。

### 添加格式支持

在上面创建的编辑器内，我们只有简单的文字编辑功能。如果我们想要加粗一段文字，则需要创建 `Formatter`。

```ts
import { FormatType, VElement } from '@textbus/core'

const boldFormatter = {
  // 设置 boldFormatter 是一个行内标签样式
  type: FormatType.InlineTag,
  // 设置 Formatter 名字为 `bold`
  name: 'bold',
  // 当 boldFormatter 渲染时，我们返回一个 strong 标签的虚拟 DOM 节点
  render() {
    return new VElement('strong')
  }
}
```

我们还需要创建一个 loader，让 TextBus 能在 HTML 中识别出加粗的格式。

```ts
export const boldFormatLoader = {
  // 当匹配到一个 DOM 元素的标签为 `strong`、`b` 或者当前元素的样式的 fontWeight 为 500 ~ 900 或者 bold 时，返回 true
  match(element) {
    return ['strong', 'b'].includes(element.tagName.toLowerCase()) ||
      ['bold', '500', '600', '700', '800', '900'].includes(element.style.fontWeight)
  },
  // 当元素匹配成功时，会调用 read 方法获取样式的值，由于加粗只有生效和不生效两种，所以，我们可以用一个 boolean 值来表示，这里可以返回 true 即可
  read() {
    return true
  },
  formatter: boldFormatter
}
```

现在，我们可以把我们创建好的 Formatter 添加到编辑器中了。

```ts
import { Editor } from '@textbus/editor'
import { boldFormatLoader } from './bold-formatter'

const editor = new Editor('#editor', {
  formatLoaders: [
    boldFormatLoader
  ]
})
```
至此，我们的编辑器就可以支持加粗文字的功能了。

等等，我们虽然添加了 boldFormatter，但并没有一个工具去触发，让它在编辑器内动态添加上去。让我们在页面添加一个按钮，当用户点击的时候，就让编辑器内的文字加粗。

```html
<div class="toolbar">
  <button type="button" id="bold-btn">加粗</button>
</div>
<div id="editor"></div>
```

```ts
import { Commander } from '@textbus/core'
import { boldFormatLoader } from './bold-formatter'
import { boldFormatter } from './inline-tag.formatter'

const boldBtn = document.getElementById('bold-btn')

// 当编辑器准备好时，我们再添加功能
editor.onReady.subscribe(injector => {
  const commander = injector.get(Commander)
  boldBtn.addEventListener('click', () => {
    commander.applyFormat(boldFormatter, true)
  })
})
```

现在，我们框选一段文字并点击加粗按钮时，你就会看到文字已经加粗了，如果，光标是闭合的，TextBus 也会智能加粗后面输入的文字。

在实际的应用中，仅仅文字加粗是不满足需求的，我们更希望如果已经加粗了，则取消加粗。这时，则需要状态查询来帮助我们完成相应的功能。让我们继续完善上面的功能。

```ts
import { Commander, Query } from '@textbus/core'
import { boldFormatLoader } from './bold-formatter'
import { boldFormatter } from './inline-tag.formatter'

const boldBtn = document.getElementById('bold-btn')

// 当编辑器准备好时，我们再添加功能
editor.onReady.subscribe(injector => {
  const commander = injector.get(Commander)
  const query = injector.get(Query)
  boldBtn.addEventListener('click', () => {
    // 通过 Query，查询当前光标所在范围是否已加粗
    const queryState = query.queryFormat(boldFormatter)
    const isBold = queryState.state === QueryStateType.Enabled
    
    // 如果已加粗，我们则取消应用加粗效果，否则就加粗
    if (isBold) {
      commander.unApplyFormat(boldFormatter)
    } else {
      commander.applyFormat(boldFormatter, true)
    }
  })
})
```
