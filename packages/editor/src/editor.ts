import { CoreEditor } from '@textbus/browser'
import { makeError } from '@textbus/core'

import { EditorOptions } from './types'
import { rootComponent } from './root.component'
import { Layout } from './layout'
import { Provider } from '@tanbo/di'
import { I18n } from './i18n'
import { i18n_zh_CN } from './i18n/zh_CN'
import { ContextMenu } from './context-menu'
import { Dialog } from './dialog'
import { EditorController } from './editor-controller'
import { Message } from './message'

const editorErrorFn = makeError('Editor')

export class Editor extends CoreEditor {
  layout = new Layout()

  private host: HTMLElement

  constructor(public selector: string | HTMLElement,
              public options: EditorOptions) {
    super(options.customRootComponent || rootComponent)
    if (typeof selector === 'string') {
      this.host = document.querySelector(selector)!
    } else {
      this.host = selector
    }
    if (!this.host || !(this.host instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.layout.workbench.append(this.scroller)
    if (options.theme) {
      this.layout.setTheme(options.theme)
    }
    this.host.append(this.layout.container)

    const editorProviders: Provider[] = [{
      provide: Layout,
      useValue: this.layout
    }, {
      provide: I18n,
      useValue: new I18n(options.i18n as any, i18n_zh_CN)
    }, {
      provide: EditorController,
      useValue: new EditorController({
        readonly: false,
        supportMarkdown: false
      })
    },
      ContextMenu,
      Dialog,
      Message
    ]
    options.providers = options.providers || []
    options.providers.push(...editorProviders)

    options.editingStyleSheets = options.editingStyleSheets || []
    options.editingStyleSheets.push(`[textbus-document=true]::before {content: attr(data-placeholder); position: absolute; opacity: 0.6; z-index: -1;}`)
    this.init(options).then(rootInjector => {
      rootInjector.get(ContextMenu)
      setTimeout(() => {
        options.plugins?.forEach(plugin => {
          plugin.setup(rootInjector)
        })
      })
    })
  }

  destroy() {
    // this.subs.forEach(i => i.unsubscribe())
  }
}
