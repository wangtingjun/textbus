import { Injector } from '@tanbo/di'
import { Observable, Subject } from '@tanbo/stream'
import { Commander, QueryState, QueryStateType } from '@textbus/core'

import { DropdownTool, DropdownToolConfig } from '../toolkit/dropdown-tool'
import { I18n } from '../../i18n'
import { ViewController } from '../../uikit/types'


class Emoji implements ViewController<any> {
  elementRef = document.createElement('div')
  onComplete: Observable<string>
  onCancel = new Observable<void>()

  private checkEvent = new Subject<string>()

  constructor() {
    this.onComplete = this.checkEvent.asObservable()
    this.elementRef.classList.add('textbus-toolbar-emoji-menu')
    const emoji: string[] = []
    for (let i = 0x1F600; i <= 0x1F64F; i++) {
      emoji.push(i.toString(16).toUpperCase())
    }
    const fragment = document.createDocumentFragment()
    const buttons = emoji.map(s => {
      const button = document.createElement('button')
      button.type = 'button'
      button.classList.add('textbus-toolbar-emoji-menu-item')
      button.innerHTML = `&#x${s};`
      fragment.appendChild(button)
      return button
    })
    this.elementRef.addEventListener('click', (ev: MouseEvent) => {
      const target = ev.target
      for (const btn of buttons) {
        if (target === btn) {
          this.checkEvent.next(btn.innerHTML)
          break
        }
      }
    })
    this.elementRef.appendChild(fragment)
  }

  update(): void {
    //
  }

  reset() {
    //
  }
}

export function emojiToolConfigFactory(injector: Injector): DropdownToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-emoji'],
    tooltip: i18n.get('plugins.toolbar.emojiTool.tooltip'),
    viewController: new Emoji(),
    queryState(): QueryState<any> {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    useValue(value: string) {
      commander.insert(value)
    }
  }
}

export const emojiTool = new DropdownTool(emojiToolConfigFactory)
