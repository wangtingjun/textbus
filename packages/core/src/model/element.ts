import { makeError } from '../_utils/make-error'

const vElementErrorFn = makeError('VElement')
const parentNode = Symbol('parentNode')

export class VTextNode {
  get parentNode() {
    return this[parentNode]
  }

  [parentNode]: VElement | null

  constructor(public textContent = '') {
  }
}

export type VElementJSXChildNode = VElement | string | number | boolean;

export interface VElementRenderFn {
  (props: { [key: string]: any }): VElement;
}

export interface VElementOptions {
  [key: string]: any
}

export class VElement {
  static createElement(tagName: string | VElementRenderFn,
                       attrs: VElementOptions,
                       ...children: VElementJSXChildNode[] | VElementJSXChildNode[][]) {
    if (typeof tagName === 'function') {
      return tagName({
        ...attrs,
        children
      })
    }
    const vNode = new VElement(tagName, attrs)
    children.flat().forEach(i => {
      if (i instanceof VElement) {
        vNode.appendChild(i)
      } else if (i !== false) {
        vNode.appendChild(new VTextNode(String(i)))
      }
    })
    return vNode
  }

  get parentNode() {
    return this[parentNode]
  }

  get children() {
    return [...this._children]
  }

  [parentNode]: VElement | null
  readonly attrs = new Map<string, any>()
  readonly styles = new Map<string, string | number>()
  readonly classes: Set<string>

  private _children: Array<VElement | VTextNode> = []

  constructor(public tagName: string,
              attrs: VElementOptions | null = null,
              children: Array<VElement | VTextNode> = []) {
    attrs = attrs || {}
    const className = (attrs.class || '').trim()
    this.classes = new Set<string>(className ? className.split(/\s+/g) : [])

    Reflect.deleteProperty(attrs, 'class')

    const style = attrs.style || ''
    const styles = new Map<string, string | number>()
    if (typeof style === 'string') {
      style.split(';').map(s => s.split(':')).forEach(v => {
        if (!v[0] || !v[1]) {
          return
        }
        styles.set(v[0].trim(), v[1].trim())
      })
    } else if (typeof style === 'object') {
      Object.keys(style).forEach(key => {
        styles.set(key, style[key])
      })
    }

    this.styles = styles

    Reflect.deleteProperty(attrs, 'style')
    Reflect.deleteProperty(attrs, 'slot')

    Object.keys(attrs).forEach(key => {
      if (/^on[A-Z]/.test(key)) {
        // listeners[key.replace(/^on/, '').toLowerCase()] = attrs[key];
      } else {
        this.attrs.set(key, attrs![key])
      }
    })

    this.appendChild(...children)
  }

  /**
   * 在最后位置添加一个子节点。
   * @param newNodes
   */
  appendChild(...newNodes: Array<VElement | VTextNode>) {
    newNodes.forEach(node => {
      node.parentNode?.removeChild(node)
      node[parentNode] = this
      this._children.push(node)
    })
  }

  removeChild(node: VTextNode | VElement) {
    const index = this._children.indexOf(node)
    if (index > -1) {
      this._children.splice(index, 1)
      node[parentNode] = null
      return
    }
    throw vElementErrorFn('node to be deleted is not a child of the current node.')
  }

  replaceChild(newNode: VElement | VTextNode, oldNode: VElement | VTextNode) {
    const index = this._children.indexOf(oldNode)
    if (index > -1) {
      newNode.parentNode?.removeChild(newNode)
      this._children.splice(index, 1, newNode)
      oldNode[parentNode] = null
      newNode[parentNode] = this
      return
    }
    throw vElementErrorFn('node to be replaced is not a child of the current node.')
  }
}
