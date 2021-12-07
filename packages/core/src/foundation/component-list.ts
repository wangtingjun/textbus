import { Inject, Injectable } from '@tanbo/di'
import { ComponentFactory } from '../define-component'
import { COMPONENT_LIST } from './_injection-tokens'

@Injectable()
export class ComponentList {
  private componentMap = new Map<string, ComponentFactory>()

  constructor(@Inject(COMPONENT_LIST) private components: ComponentFactory[]) {
    components.forEach(f => {
      this.componentMap.set(f.name, f)
    })
  }

  get(key: string) {
    return this.componentMap.get(key)
  }
}
