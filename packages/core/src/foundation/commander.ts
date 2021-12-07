import { Injectable } from '@tanbo/di'

import { TBSelection } from './selection'
import { Component, Formatter, FormatType, FormatValue, placeholder, Slot } from '../model/_api'
import { Keyboard } from './keyboard'
import { NativeRenderer } from './_injection-tokens'
import { invokeListener, TBEvent } from '../define-component'

@Injectable()
export class Commander {
  constructor(private selection: TBSelection,
              private nativeRenderer: NativeRenderer,
              private keyboard: Keyboard) {
  }

  copy() {
    this.nativeRenderer.copy()
  }

  cut() {
    if (this.selection.isCollapsed) {
      return
    }
    this.copy()
    this.keyboard.delete()
  }

  paste(pasteSlot: Slot, text: string) {
    if (!this.selection.isSelected) {
      return
    }
    if (!this.selection.isCollapsed) {
      this.keyboard.delete()
    }
    const component = this.selection.commonAncestorComponent!
    const slot = this.selection.commonAncestorSlot!
    let isPreventDefault = true
    invokeListener(component, 'onPaste', new TBEvent(slot, {
      index: this.selection.startOffset!,
      data: pasteSlot,
      text
    }, () => {
      isPreventDefault = false
    }))
    if (isPreventDefault) {
      return
    }
    const contents = pasteSlot.sliceContent()

    contents.forEach(i => {
      this.keyboard.insert(i)
    })
  }

  cleanFormats(ignoreFormatters: Formatter[] = []) {
    const selection = this.selection
    selection.getBlocks().forEach(scope => {
      if (scope.slot === selection.startSlot &&
        scope.startIndex <= selection.startOffset!) {
        scope.startIndex = selection.startOffset!
      }
      if (scope.slot === selection.endSlot &&
        scope.endIndex >= selection.endOffset!) {
        scope.endIndex = selection.endOffset!
      }
      let isDeleteBlockFormat = false
      const slot = scope.slot
      if (scope.startIndex === 0) {
        if (scope.endIndex === slot.length) {
          isDeleteBlockFormat = true
        } else if (scope.endIndex === slot.length - 1) {
          const lastContent = slot.getContentAtIndex(slot.length - 1)
          if (lastContent === '\n') {
            isDeleteBlockFormat = true
          }
        }
      }

      slot.getFormats().forEach(i => {
        if (i.formatter.type === FormatType.Block && !isDeleteBlockFormat || ignoreFormatters.includes(i.formatter)) {
          return
        }
        slot.retain(scope.startIndex)
        slot.retain(scope.endIndex, i.formatter, null)
      })
    })
  }

  applyFormat(formatter: Formatter, value: FormatValue) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (formatter.type === FormatType.Block || slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, value)
      } else {
        this.keyboard.insert(placeholder)
        const startOffset = this.selection.startOffset!
        slot.retain(startOffset - 1)
        slot.retain(startOffset, formatter, value)
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex, formatter, value)
    })
  }

  unApplyFormat(formatter: Formatter) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (formatter.type === FormatType.Block || slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, null)
      } else {
        const startOffset = this.selection.startOffset!
        const prevContent = slot.getContentAtIndex(startOffset - 1)
        if (prevContent === placeholder) {
          slot.retain(startOffset - 1)
          slot.retain(startOffset, formatter, null)
        } else {
          this.keyboard.insert(placeholder)
          slot.retain(startOffset)
          slot.retain(startOffset + 1, formatter, null)
        }
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex, formatter, null)
    })
  }

  insertBefore(component: Component, ref: Component) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index)
      parentSlot.insert(component)
    }
  }

  insertAfter(component: Component, ref: Component) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index + 1)
      parentSlot.insert(component)
    }
  }

  replace(source: Component, target: Component) {
    this.insertBefore(target, source)
    this.remove(source)
  }

  remove(component: Component) {
    const parentSlot = component?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(component)
      parentSlot.retain(index + 1)
      parentSlot.delete(1)
    }
  }
}
