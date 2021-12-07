import { InjectionToken } from '@tanbo/di'
import { ComponentFactory, SlotLiteral } from '@textbus/core'

import { BaseEditorOptions } from './types'

/**
 * 编辑器可选项依赖注入 key
 */
export const EDITOR_OPTIONS = new InjectionToken<BaseEditorOptions>('EDITOR_OPTIONS')
/**
 * 编辑器 Document 依赖注入 key
 */
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT')

export const EDITOR_CONTAINER = new InjectionToken<HTMLElement>('EDITOR_CONTAINER')

export const SCROLL_CONTAINER = new InjectionToken<HTMLElement>('SCROLL_CONTAINER')

export const ROOT_COMPONENT_FACTORY = new InjectionToken<ComponentFactory>('ROOT_COMPONENT_FACTORY')

export const INIT_CONTENT = new InjectionToken<string | SlotLiteral>('INIT_CONTENT')
