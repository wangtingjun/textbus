import { Injector } from '@tanbo/di'
import {
  ComponentInstance, ComponentMethods,
  ContentType, defineComponent,
  Translator, useState,
  VElement
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

export interface ImageComponentLiteral {
  src: string
  maxWidth?: string;
  maxHeight?: string;
  width?: string
  height?: string
  margin?: string
  float?: string
}

export interface ImageComponentInstance extends ComponentMethods<ImageComponentLiteral> {
  merge(state: Partial<ImageComponentLiteral>): void
}

export const imageComponent = defineComponent({
  type: ContentType.InlineComponent,
  name: 'ImgComponent',
  transform(translator: Translator, state: ImageComponentLiteral): ImageComponentLiteral {
    return state
  },
  setup(state: ImageComponentLiteral): ImageComponentInstance {
    const changeController = useState(state)

    changeController.onChange.subscribe(v => {
      state = v
    })

    return {
      render() {
        return new VElement('img', {
          src: state.src,
          style: {
            width: state.width,
            height: state.height,
            maxWidth: state.maxWidth,
            maxHeight: state.maxHeight,
            margin: state.margin,
            float: state.float
          }
        })
      },
      toJSON() {
        return {
          ...state
        }
      },
      merge(s: Partial<ImageComponentLiteral>) {
        changeController.update({
          ...state,
          ...s
        })
      }
    }
  }
})

export const imageComponentLoader: ComponentLoader = {
  metadata: {
    styles: ['img{max-width: 100%}']
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'IMG'
  },
  read(element: HTMLElement, injector: Injector): ComponentInstance {
    const style = element.style
    return imageComponent.createInstance(injector, {
      src: element.getAttribute('src') || '',
      width: style.width,
      height: style.height,
      margin: style.margin,
      float: style.float,
      maxWidth: style.maxWidth,
      maxHeight: style.maxHeight
    })
  },
  component: imageComponent
}
