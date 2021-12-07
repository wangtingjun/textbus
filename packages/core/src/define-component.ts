import { Observable, Subject } from '@tanbo/stream'
import { Injector } from '@tanbo/di'

import { Translator } from './foundation/_api'
import {
  Component,
  ComponentInstance,
  ContentType,
  ChangeMarker,
  Slot,
  SlotLiteral,
  SlotRestore,
  Slots
} from './model/_api'

export interface ComponentOptions<Instance extends ComponentInstance<State>, State, InitData> {
  name: string
  type: ContentType

  transform(translator: Translator, state: State): InitData

  setup(initState?: InitData): Instance
}

export interface ComponentFactory<Component = any, State = any, InitData = any> {
  name: string

  transform(translator: Translator, state: State): InitData

  createInstance(context: Injector, state?: InitData): Component
}

export interface ChangeController<T> {
  update(newState: T): void

  onChange: Observable<T>
}

export interface Ref<T> {
  current: T | null
}

interface ComponentContext<T> {
  slots: Slots<any>
  initState?: T
  changeController: ChangeController<T>
  contextInjector: Injector
  component: Component
}

let context: ComponentContext<any> | null = null

export function defineComponent<Instance extends ComponentInstance,
  State = any,
  InitData = any>(options: ComponentOptions<Instance, State, InitData>): ComponentFactory<Component<Instance, State>, State, InitData> {
  return {
    name: options.name,
    transform(translator: Translator, state: State): InitData {
      return options.transform(translator, state)
    },
    createInstance(contextInjector: Injector, initData: InitData) {
      const marker = new ChangeMarker()
      const stateChangeSubject = new Subject<any>()
      recordContextListener()

      const changeController: ChangeController<any> = {
        update(newState: any) {
          if (typeof newState === 'object') {
            Object.freeze(newState)
          }
          stateChangeSubject.next(newState)
          const oldState = state
          state = newState
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              state
            }],
            unApply: [{
              type: 'apply',
              state: oldState
            }]
          })
        },
        onChange: stateChangeSubject.asObservable()
      }

      const component: Component<Instance, State> = {
        changeMarker: marker,
        parent: null,
        name: options.name,
        length: 1,
        type: options.type,
        slots: null as any,
        instance: null as any,
        useState(newState: State) {
          const oldState = state
          state = newState
          stateChangeSubject.next(newState)
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              state: newState
            }],
            unApply: [{
              type: 'apply',
              state: oldState
            }]
          })
        },
        toJSON() {
          return {
            name: options.name,
            state: component.instance.toJSON()
          }
        }
      }
      context = {
        contextInjector,
        changeController,
        slots: new Slots(component, () => new Slot([])),
        component
      }
      component.instance = options.setup(initData)
      component.slots = context.slots
      let state = context.initState

      context.slots.onChange.subscribe(ops => {
        marker.markAsDirtied(ops)
      })

      context.slots.onChildSlotChange.subscribe(d => {
        marker.markAsChanged(d.operation)
      })

      context = null
      recordContextListenerEnd(component)
      return component
    }
  }
}

export function useContext(): Injector {
  if (!context) {
    throw new Error('不能在组件外部调用！')
  }
  return context.contextInjector
}

export function useSlots<T extends Slot, State extends SlotLiteral>(slots: T[], slotRestore: SlotRestore<T, State>): Slots<State, T> {
  if (!context) {
    throw new Error('不能在组件外部调用！')
  }
  const s = new Slots(context.component, slotRestore, slots)
  context.slots = s
  return s
}

export function useState<T>(initState: T) {
  if (!context) {
    throw new Error('不能在组件外部调用！')
  }
  if (typeof initState === 'object') {
    Object.freeze(initState)
  }
  context.initState = initState
  return context.changeController as ChangeController<T>
}

export function useRef<T>() {
  return {
    current: null
  } as Ref<T>
}

export function useRefs<T>() {
  return [] as T[]
}

let eventHandleFn: null | ((...args: any[]) => void) = null
let isPreventDefault = false


export class TBEvent<T, S extends Slot = Slot> {
  constructor(public target: S,
              public data: T,
              eventHandle: (...args: any[]) => void
  ) {
    eventHandleFn = eventHandle
  }

  preventDefault() {
    isPreventDefault = true
  }
}

export interface InsertEventData {
  index: number
  content: string | Component
}

export interface EnterEventData {
  index: number
}

export interface DeleteEventData {
  index: number
  count: number
  isMove: boolean
  isStart: boolean
  isEnd: boolean
}

export interface PasteEventData {
  index: number
  data: Slot
  text: string
}

export interface ContextMenuEventData {
  // srcSlot: Slot
  // srcComponent: Component<any>
  // formSlot: Slot
  // formComponent: Component<any>
  index: number
}

export interface ContextMenuItem {
  iconClasses?: string[]
  label: string
  disabled?: boolean

  onClick(): void
}

export interface EventTypes {
  onPaste: (event: TBEvent<PasteEventData>) => void
  onInserted: (event: TBEvent<InsertEventData>) => void
  onInsert: (event: TBEvent<InsertEventData>) => void
  onEnter: (event: TBEvent<EnterEventData>) => void
  onDelete: (event: TBEvent<DeleteEventData>) => void
  onContextMenu: (event: TBEvent<ContextMenuEventData>) => ContextMenuItem[]
  onViewChecked: () => void
  onViewInit: () => void
}

class EventCache<T, K extends keyof T = keyof T> {
  private listeners = new Map<K, Array<T[K]>>()

  add(eventType: K, callback: T[K]) {
    let callbacks = this.listeners.get(eventType)
    if (!callbacks) {
      callbacks = []
      this.listeners.set(eventType, callbacks)
    }
    callbacks.push(callback)
  }

  get(eventType: K): Array<T[K]> {
    return this.listeners.get(eventType) || []
  }

  clean(eventType: K) {
    this.listeners.delete(eventType)
  }
}

const eventCaches = new WeakMap<Component, EventCache<EventTypes>>()

let rendererContext: EventCache<EventTypes> | null = null

function recordContextListener() {
  rendererContext = new EventCache()
}

function recordContextListenerEnd(component: Component) {
  if (rendererContext) {
    eventCaches.set(component, rendererContext)
  }
  rendererContext = null
}

export function invokeListener(target: Component, eventType: 'onViewChecked'): void
export function invokeListener(target: Component, eventType: 'onDelete', data: TBEvent<DeleteEventData>): void
export function invokeListener(target: Component, eventType: 'onEnter', data: TBEvent<EnterEventData>): void
export function invokeListener(target: Component, eventType: 'onInsert', data: TBEvent<InsertEventData>): void
export function invokeListener(target: Component, eventType: 'onInserted', data: TBEvent<InsertEventData>): void
export function invokeListener(target: Component, eventType: 'onContextMenu', data: TBEvent<ContextMenuEventData>): void
export function invokeListener(target: Component, eventType: 'onPaste', data: TBEvent<PasteEventData>): void
export function invokeListener<K extends keyof EventTypes,
  D = EventTypes[K] extends (...args: infer U) => any ? U : never>(target: Component, eventType: K, data?: D) {
  const cache = eventCaches.get(target)
  if (cache) {
    const callbacks = cache.get(eventType)
    const values = callbacks.map(fn => {
      return (fn as any)(data)
    })
    if (eventType === 'onViewChecked') {
      const viewInitCallbacks = cache.get('onViewInit')
      cache.clean('onViewInit')
      viewInitCallbacks.forEach(fn => {
        (fn as any)(data)
      })
    }
    if (!isPreventDefault) {
      eventHandleFn?.(...values)
    }
    isPreventDefault = false
    eventHandleFn = null
  }
}

export function onPaste(listener: EventTypes['onPaste']) {
  if (rendererContext) {
    rendererContext.add('onPaste', listener)
  }
}

export function onContextMenu(listener: EventTypes['onContextMenu']) {
  if (rendererContext) {
    rendererContext.add('onContextMenu', listener)
  }
}

export function onViewChecked(listener: EventTypes['onViewChecked']) {
  if (rendererContext) {
    rendererContext.add('onViewChecked', listener)
  }
}

export function onViewInit(listener: EventTypes['onViewInit']) {
  if (rendererContext) {
    rendererContext.add('onViewInit', listener)
  }
}

export function onDelete(listener: EventTypes['onDelete']) {
  if (rendererContext) {
    rendererContext.add('onDelete', listener)
  }
}

export function onEnter(listener: EventTypes['onEnter']) {
  if (rendererContext) {
    rendererContext.add('onEnter', listener)
  }
}

export function onInsert(listener: EventTypes['onInsert']) {
  if (rendererContext) {
    rendererContext.add('onInsert', listener)
  }
}

export function onInserted(listener: EventTypes['onInserted']) {
  if (rendererContext) {
    rendererContext.add('onInserted', listener)
  }
}
