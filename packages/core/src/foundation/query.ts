import { Injectable } from '@tanbo/di'

import { Selection } from './selection'
import { ComponentInstance, ComponentMethods, Formatter, FormatValue, Slot } from '../model/_api'
import { Component } from '../define-component'

/**
 * TextBus 状态查询状态枚举
 */
export enum QueryStateType {
  /** 正常 */
  Normal = 'Normal',
  /** 当前不可用 */
  Disabled = 'Disabled',
  /** 当前状态为生效 */
  Enabled = 'Enabled'
}

/**
 * TextBus 状态查询结果，当状态为禁用时，`value` 为 null
 */
export interface QueryState<V, S = QueryStateType, K = S extends QueryStateType.Enabled ? V : null> {
  state: S
  value: K
}

/**
 * TextBus 状态查询类，用于查询组件或格式在当前选区的状态
 */
@Injectable()
export class Query {
  constructor(private selection: Selection) {
  }

  /**
   * 查询格式在当前选区的状态
   * @param formatter 要查询的格式
   */
  queryFormat(formatter: Formatter): QueryState<FormatValue> {
    if (!this.selection.isSelected) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }
    const states = this.selection.getSelectedScopes().map(i => {
      return this.getStatesByRange(i.slot, formatter, i.startIndex, i.endIndex)
    })
    return this.mergeState(states)
  }

  /**
   * 查询组件在选区内的状态
   * @param comp 要查询的组件
   * @param filter 查询结构过滤函数，过滤不需要的数据
   */
  queryComponent<Instance extends ComponentMethods>(
    comp: Component<ComponentInstance<Instance>>,
    filter?: (instance: ComponentInstance<Instance>) => boolean): QueryState<ComponentInstance<Instance>> {
    let parent = this.selection.commonAncestorComponent

    while (parent) {
      if (parent.name === comp.name) {
        if (!filter || filter(parent as ComponentInstance<Instance>)) {
          return {
            state: QueryStateType.Enabled,
            value: parent as ComponentInstance<Instance>
          }
        }
      }
      parent = parent.parent?.parent || null
    }
    return {
      state: QueryStateType.Normal,
      value: null
    }
  }

  /**
   * 查询当前选区是否包含在组件内
   * @param comp 要查询的组件
   */
  queryWrappedComponent<Instance extends ComponentMethods>(comp: Component<ComponentInstance<Instance>>): QueryState<ComponentInstance<Instance>> {
    const selection = this.selection
    if (!selection.isSelected ||
      selection.isCollapsed ||
      selection.startSlot !== selection.endSlot ||
      selection.endOffset! - selection.startOffset! > 1) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }
    const component = selection.startSlot!.getContentAtIndex(selection.startOffset!)
    if (typeof component !== 'string' && component.name === comp.name) {
      return {
        state: QueryStateType.Enabled,
        value: component as ComponentInstance<Instance>
      }
    }
    return {
      state: QueryStateType.Normal,
      value: null
    }
  }

  private getStatesByRange(slot: Slot, formatter: Formatter, startIndex: number, endIndex: number): QueryState<FormatValue> | null {

    if (startIndex === endIndex) {
      const format = startIndex === 0 ? slot.getFormatRangesByFormatter(formatter, 0, 1).shift() : slot.getFormatRangesByFormatter(formatter, startIndex - 1, endIndex).shift()
      if (format) {
        return {
          state: QueryStateType.Enabled,
          value: format.value
        }
      }
      return null
    }

    const childContents = slot.sliceContent(startIndex, endIndex)
    const states: Array<QueryState<FormatValue> | null> = []

    let index = startIndex

    for (const child of childContents) {
      if (typeof child === 'string') {
        const formats = slot.getFormatRangesByFormatter(formatter, index, index + child.length)
        let s = index
        for (const f of formats) {
          if (s !== f.startIndex) {
            return {
              state: QueryStateType.Normal,
              value: null
            }
          } else {
            states.push({
              state: QueryStateType.Enabled,
              value: f.value
            })
          }
          s = f.endIndex
        }

        if (s !== index + child.length) {
          return {
            state: QueryStateType.Normal,
            value: null
          }
        }
      } else {
        child.slots.toArray().forEach(i => {
          states.push(this.getStatesByRange(i, formatter, 0, i.length))
        })
      }
      index += child.length
    }
    return this.mergeState(states)
  }

  private mergeState(states: Array<QueryState<FormatValue> | null>): QueryState<FormatValue> {
    const states1 = states.filter(i => i) as QueryState<FormatValue>[]
    const states2 = states1.filter(i => i.state !== QueryStateType.Normal)
    if (states.length !== states2.length) {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    }

    if (states2.length) {
      return {
        state: QueryStateType.Enabled,
        value: states2[0].value
      }
    }
    return {
      state: QueryStateType.Normal,
      value: null
    }
  }
}
