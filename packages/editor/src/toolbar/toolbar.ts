import { auditTime, fromEvent, merge, Subscription } from '@tanbo/stream'
import { Injector } from '@tanbo/di'
import { createElement, EDITABLE_DOCUMENT, Plugin } from '@textbus/browser'
import { Keymap, Renderer, Selection } from '@textbus/core'

import { Tool } from './types'
import { Layout } from '../layout'
import { createKeymap } from './toolkit/_utils/_create-keymap'

export class Toolbar implements Plugin {
  private elementRef!: HTMLElement
  private toolWrapper!: HTMLElement
  private keymapPrompt!: HTMLElement

  private subs: Subscription[] = []

  constructor(private tools: Array<Tool | Tool[]> = []) {
  }

  setup(injector: Injector) {
    const layout = injector.get(Layout)
    const selection = injector.get(Selection)
    const renderer = injector.get(Renderer)
    const editableDocument = injector.get(EDITABLE_DOCUMENT)
    this.elementRef = createElement('div', {
      classes: ['textbus-toolbar'],
      children: [
        this.toolWrapper = createElement('div', {
          classes: ['textbus-toolbar-wrapper']
        }),
        this.keymapPrompt = createElement('div', {
          classes: ['textbus-toolbar-keymap-prompt']
        })
      ]
    })
    layout.top.append(this.elementRef)
    this.tools.forEach(tool => {
      const group = document.createElement('div')
      group.classList.add('textbus-toolbar-group')
      this.toolWrapper.appendChild(group)
      if (Array.isArray(tool)) {
        tool.forEach(t => {
          group.appendChild(t.setup(injector, this.toolWrapper))
        })
        return
      }
      group.appendChild(tool.setup(injector, this.toolWrapper))
    })
    const tools = this.tools.flat()
    this.subs.push(
      merge(
        selection.onChange,
        renderer.onViewChecked,
        fromEvent(editableDocument, 'click')
      ).pipe(auditTime(100)).subscribe(() => {
        const event = document.createEvent('Event')
        event.initEvent('click', true, true)
        this.elementRef.dispatchEvent(event)
        tools.forEach(tool => {
          tool.refreshState()
        })
      }),
      fromEvent(this.elementRef, 'mouseover').subscribe(ev => {
        const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement)
        if (keymap) {
          try {
            const config: Keymap = JSON.parse(keymap)
            this.keymapPrompt.innerHTML = ''
            this.keymapPrompt.append(...createKeymap(config))
            this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt-show')
            return
          } catch (e) {
            //
          }
        }
        this.keymapPrompt.classList.remove('textbus-toolbar-keymap-prompt-show')
      })
    )
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private findNeedShowKeymapHandler(el: HTMLElement): string {
    if (el === this.elementRef) {
      return ''
    }
    if (el.dataset.keymap) {
      return el.dataset.keymap
    }
    return this.findNeedShowKeymapHandler(el.parentNode as HTMLElement)
  }
}
