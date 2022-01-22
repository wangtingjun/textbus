import { InjectionToken } from '@tanbo/di'

import { ComponentInstance, Formatter } from '../model/_api'
import { Component } from '../define-component'

/**
 * 原生元素节点抽象类型
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type NativeNode = {} & any

/**
 * 原生渲染器抽象类，由具体平台提供具体实现
 */
export abstract class NativeRenderer {
  abstract createElement(name: string): NativeNode

  abstract createTextNode(textContent: string): NativeNode

  abstract appendChild(parent: NativeNode, newChild: NativeNode): void

  abstract addClass(target: NativeNode, name: string): void

  abstract removeClass(target: NativeNode, name: string): void

  abstract setAttribute(target: NativeNode, key: string, value: string): void

  abstract removeAttribute(target: NativeNode, key: string): void

  abstract setStyle(target: NativeNode, key: string, value: any): void

  abstract replace(newChild: NativeNode, oldChild: NativeNode): void

  abstract remove(node: NativeNode): void

  abstract insertBefore(newNode: NativeNode, ref: NativeNode): void

  abstract getChildByIndex(parent: NativeNode, index: number): NativeNode | null

  abstract listen<T = any>(node: NativeNode, type: string, callback: (ev: T) => any): void

  abstract unListen(node: NativeNode, type: string, callback: (ev: any) => any): void

  abstract copy(): void
}

/**
 * 根节点及原生根元素节点引用类
 */
export abstract class RootComponentRef {
  abstract component: ComponentInstance
  abstract host: NativeNode
}

/**
 * @internal TextBus 组件列表注入 token
 */
export const COMPONENT_LIST = new InjectionToken<Component[]>('COMPONENT_LIST')
/**
 * @internal TextBus 格式列表注入 token
 */
export const FORMATTER_LIST = new InjectionToken<Formatter[]>('FORMATTER_LIST')
