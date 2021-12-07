import { ComponentFactory } from '@textbus/core'
import { BaseEditorOptions } from '@textbus/browser'
import { I18NConfig } from './i18n'

export interface EditorOptions extends BaseEditorOptions {
  theme?: string
  customRootComponent?: ComponentFactory
  /** 国际化配置 */
  i18n?: I18NConfig
  placeholder?: string
}
