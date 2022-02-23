import { Injector } from '@tanbo/di'
import { onEnter, Slots, Selection, useSelf } from '@textbus/core'

import { paragraphComponent } from '../paragraph.component'
import { blockquoteComponent } from '../blockquote.component'

/**
 * 本换行方法只为段落、标题和块组件设计，主要作用是在实现换行功能同时，可以跳出两层组件。
 * 如，在引用块里的段落，当尾部的两个段落都为空，且再次触发换行时，则把新的段落插入在引用块后
 * @param injector
 * @param slots
 */
export function useEnterBreaking(injector: Injector, slots: Slots) {
  const selection = injector.get(Selection)
  const self = useSelf()
  onEnter(ev => {
    const parentSlot = self.parent!

    const index = parentSlot.indexOf(self)
    parentSlot.retain(index + 1)
    const currentSlot = slots.get(0)!
    const nextSlot = currentSlot.cut(ev.data.index)
    const component = paragraphComponent.createInstance(injector, nextSlot)
    selection.setLocation(component.slots.get(0)!, 0)
    const beforeComponent = parentSlot.getContentAtIndex(index - 1)
    if (index === parentSlot.length - 1 &&
      beforeComponent &&
      typeof beforeComponent !== 'string' &&
      ['BlockComponent', 'ParagraphComponent', 'HeadingComponent'].includes(beforeComponent.name) &&
      beforeComponent.slots.get(0)?.isEmpty &&
      currentSlot.isEmpty &&
      nextSlot.isEmpty &&
      parentSlot.parent?.name === blockquoteComponent.name) {
      // 当当前插槽为空，且新换行的插槽和前一个组件的插槽都为空，则删除当前组件和前一个组件，同时跳出上层组件，并且把新的段落插入在上层组件之后。
      const host = parentSlot.parentSlot
      if (host) {
        const index2 = host.indexOf(self.parentComponent!)
        parentSlot.delete(2)
        host.retain(index2 + 1)
        host.insert(component)
        ev.preventDefault()
        return
      }
    }
    parentSlot.insert(component)
    ev.preventDefault()
  })
}
