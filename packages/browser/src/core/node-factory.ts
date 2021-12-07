import { Inject, Injectable } from '@tanbo/di'
import { NativeNode, NativeRenderer } from '@textbus/core'

import { EDITABLE_DOCUMENT } from './injection-tokens'

@Injectable()
export class NodeFactory implements NativeRenderer {
  constructor(@Inject(EDITABLE_DOCUMENT) private document: Document) {
  }

  createTextNode(textContent: string): NativeNode {
    return this.document.createTextNode(NodeFactory.replaceEmpty(textContent, '\u00a0'))
  }

  createElement(name: string): NativeNode {
    return this.document.createElement(name)
  }

  appendChild(parent: NativeNode, newChild: NativeNode) {
    parent.appendChild(newChild)
  }

  remove(node: NativeNode) {
    node.parentNode.removeChild(node)
  }

  insertBefore(newNode: NativeNode, ref: NativeNode) {
    ref.parentNode.insertBefore(newNode, ref)
  }

  getChildByIndex(parent: NativeNode, index: number): NativeNode | null {
    return parent.childNodes[index] || null
  }

  addClass(target: NativeNode, name: string) {
    target.classList.add(name)
  }

  removeClass(target: NativeNode, name: string) {
    target.classList.remove(name)
  }

  setStyle(target: NativeNode, key: string, value: any) {
    target.style[key] = value
  }

  setAttribute(target: NativeNode, key: string, value: string) {
    target.setAttribute(key, value)
  }

  removeAttribute(target: NativeNode, key: string) {
    target.removeAttribute(key)
  }

  replace(newChild: NativeNode, oldChild: NativeNode) {
    oldChild.parentNode.replaceChild(newChild, oldChild)
  }

  copy() {
    this.document.execCommand('copy')
  }

  static replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('')
    }).replace(/^\s|\s$/g, target)
  }
}
