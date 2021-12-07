import { Injectable, Injector } from '@tanbo/di'

import {
  Component,
  ComponentLiteral,
  FormatType,
  Slot,
  SlotLiteral
} from '../model/_api'
import { FormatterList } from './formatter-list'
import { ComponentList } from './component-list'

@Injectable()
export class Translator {
  constructor(private contextInjector: Injector,
              private componentFactoryMap: ComponentList,
              private formatterMap: FormatterList) {
  }

  createSlot(slotLiteral: SlotLiteral): Slot {
    const slot = new Slot(slotLiteral.schema)
    return this.loadSlot(slot, slotLiteral)
  }

  createComponent(componentLiteral: ComponentLiteral): Component | null {
    const factory = this.componentFactoryMap.get(componentLiteral.name)
    if (factory) {
      const state = factory.transform(this, componentLiteral.state)
      return factory.createInstance(this.contextInjector, state)
    }
    return null
  }

  fillSlot<T extends SlotLiteral, U extends Slot>(source: T, target: U): U {
    return this.loadSlot(target, source)
  }

  private loadSlot<T extends SlotLiteral, U extends Slot>(slot: U, slotLiteral: T): U {
    slotLiteral.content.forEach(i => {
      if (typeof i !== 'string') {
        const component = this.createComponent(i)
        if (component) {
          slot.insert(component)
        }
        return
      }
      slot.insert(i)
    })

    Object.keys(slotLiteral.formats).forEach(key => {
      const formatter = this.formatterMap.get(key)
      if (formatter) {
        if (formatter.type === FormatType.Block) {
          slotLiteral.formats[key].forEach(i => {
            slot.retain(0)
            slot.retain(slot.length, formatter, i.value)
          })
          return
        }
        slotLiteral.formats[key].forEach(i => {
          slot.retain(i.startIndex)
          slot.retain(i.endIndex, formatter, i.value)
        })
      }
    })

    return slot
  }
}
