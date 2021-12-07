import 'reflect-metadata'
import "./index.scss"
import { createEditor } from '@textbus/editor'

// const json = require('./content.json')
// console.log(json)

const editor = createEditor(document.getElementById('box')!, {
  // theme: 'dark',
  // content: json,
  content: document.getElementById('template')?.innerHTML,
  placeholder: '欢迎你使用 TextBus 富文本编辑器...'
})
