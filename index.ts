import "./index.scss"
import { createEditor } from '@textbus/editor'
/*import { Renderer, RootComponentRef } from '@textbus/core';
import { Type } from '@tanbo/di';*/

const editor = createEditor(document.getElementById('box')!, {
  // theme: 'dark',
  // content: json,
  content: document.getElementById('template')?.innerHTML,
  // content: '',
  placeholder: '欢迎你使用 TextBus 富文本编辑器...',
  // plugins: []
  uploader() {
    return '/xxx'
  }
})

editor.onChange.subscribe(() => {
  const contents = editor.getContents()
  // console.log(contents.content)
  // console.log(editor.getJSON().content)
})
