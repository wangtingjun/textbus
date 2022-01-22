import { Injectable } from '@tanbo/di'
import { Commander, History, Keyboard, Selection } from '@textbus/core'
import { Plugin } from '../core/_api'

@Injectable()
export class DefaultShortcut implements Plugin {
  constructor(private selection: Selection,
              private history: History,
              private commander: Commander,
              private keyboard: Keyboard) {
  }

  setup() {
    const keyboard = this.keyboard
    keyboard.addShortcut({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        this.commander.enter()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'Enter',
        shiftKey: true
      },
      action: () => {
        const startOffset = this.selection.startOffset!
        const startSlot = this.selection.startSlot!
        const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
        const content = isToEnd ? '\n\n' : '\n'
        const isInserted = this.commander.insert(content)
        if (isInserted && isToEnd) {
          this.selection.setLocation(startSlot, startOffset + 1)
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['Delete', 'Backspace']
      },
      action: (key) => {
        this.commander.delete(key === 'Backspace')
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            this.selection.toPrevious()
            break
          case 'ArrowRight':
            this.selection.toNext()
            break
          case 'ArrowUp':
            this.selection.toPreviousLine()
            break
          case 'ArrowDown':
            this.selection.toNextLine()
            break
        }
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        this.selection.selectAll()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'c',
        ctrlKey: true
      },
      action: () => {
        this.commander.copy()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'x',
        ctrlKey: true
      },
      action: () => {
        this.commander.cut()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true
      },
      action: () => {
        this.history.back()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      },
      action: () => {
        this.history.forward()
      }
    })
  }
}
