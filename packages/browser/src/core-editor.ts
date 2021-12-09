import { Injector, NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'
import {
  Commander, COMPONENT_LIST,
  Component, ComponentList, FORMATTER_LIST, FormatterList,
  History, HOST_NATIVE_NODE,
  NativeRenderer,
  NativeSelectionBridge,
  Query,
  Renderer, RootComponentRef,
  TBSelection,
  Translator
} from '@textbus/core'

import { Parser, ComponentRef } from './dom-support/_api'
import { createElement } from './_utils/uikit'
import {
  getIframeHTML,
  BaseEditorOptions,
  Input,
  EDITABLE_DOCUMENT,
  EDITOR_CONTAINER,
  EDITOR_OPTIONS,
  INIT_CONTENT,
  ROOT_COMPONENT_FACTORY,
  NodeFactory,
  SelectionBridge, TBPlugin, SCROLL_CONTAINER
} from './core/_api'
import { DefaultShortcut } from './preset/_api'

export class CoreEditor {
  scroller = createElement('div', {
    styles: {
      overflow: 'auto',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box'
    }
  })

  docContainer = createElement('div', {
    styles: {
      padding: '8px 0',
      position: 'relative',
      boxShadow: '1px 2px 4px rgb(0,0,0,0.2)',
      backgroundColor: '#fff',
      minHeight: '100%',
      margin: '0 auto',
      transition: 'width 1.2s cubic-bezier(.36,.66,.04,1)',
      boxSizing: 'border-box'
    }
  })

  private defaultPlugins: Type<TBPlugin>[] = [
    DefaultShortcut,
  ]

  constructor(public rootComponentFactory: Component) {
    this.scroller.appendChild(this.docContainer)
  }

  init(options: BaseEditorOptions): Promise<Injector> {
    return this.createLayout().then(layout => {
      const staticProviders: Provider[] = [{
        provide: EDITABLE_DOCUMENT,
        useValue: layout.document
      }, {
        provide: EDITOR_OPTIONS,
        useValue: options
      }, {
        provide: EDITOR_CONTAINER,
        useValue: layout.workbench
      }, {
        provide: SCROLL_CONTAINER,
        useValue: this.scroller
      }, {
        provide: INIT_CONTENT,
        useValue: options.content || ''
      }, {
        provide: ROOT_COMPONENT_FACTORY,
        useValue: this.rootComponentFactory
      }, {
        provide: NativeRenderer,
        useClass: NodeFactory
      }, {
        provide: NativeSelectionBridge,
        useClass: SelectionBridge
      }, {
        provide: HOST_NATIVE_NODE,
        useValue: layout.document.body
      }, {
        provide: RootComponentRef,
        useClass: ComponentRef
      }, {
        provide: COMPONENT_LIST,
        useValue: (options.componentLoaders || []).map(i => i.component)
      }, {
        provide: FORMATTER_LIST,
        useValue: (options.formatLoaders || []).map(i => i.formatter)
      }, {
        provide: Injector,
        useFactory() {
          return rootInjector
        }
      }]

      const rootInjector = new ReflectiveInjector(new NullInjector(), [
        ...staticProviders,
        Commander,
        ComponentList,
        FormatterList,
        History,
        Query,
        Renderer,
        TBSelection,
        Translator,

        NodeFactory,
        Parser,
        Input,
        SelectionBridge,
        ComponentRef,
        ...this.defaultPlugins,
        ...(options.providers || [])
      ])

      this.bootstrap(rootInjector)
      return rootInjector
    })
  }

  private bootstrap(rootInjector: ReflectiveInjector,) {
    const doc = rootInjector.get(EDITABLE_DOCUMENT)
    const options = rootInjector.get(EDITOR_OPTIONS)
    const rootComponentRef = rootInjector.get(ComponentRef)

    this.initDocStyleSheets(doc, options)

    rootComponentRef.init().then(() => {
      rootInjector.get(Input)
      rootInjector.get(History).listen()
    })

    this.defaultPlugins.forEach(i => rootInjector.get(i).setup(rootInjector))

    const resizeObserver = new ResizeObserver((e) => {
      this.docContainer.style.height = e[0].borderBoxSize[0].blockSize + 'px'
    })
    resizeObserver.observe(doc.body as any)
  }

  private initDocStyleSheets(doc: Document, options: BaseEditorOptions) {
    const links: Array<{ [key: string]: string }> = []

    const componentStyles = (options.componentLoaders || []).filter(i => i.resources).map(i => i.resources!).map(metadata => {
      if (Array.isArray(metadata.links)) {
        links.push(...metadata.links)
      }
      return [metadata.styles?.join('') || '', metadata.editModeStyles?.join('') || ''].join('')
    }).join('')

    links.forEach(link => {
      const linkEle = doc.createElement('link')
      Object.assign(linkEle, link)
      doc.head.appendChild(linkEle)
    })
    const docStyles = CoreEditor.cssMin([componentStyles, ...(options.styleSheets || [])].join(''))
    const styleEl = doc.createElement('style')
    styleEl.innerHTML = CoreEditor.cssMin([...docStyles, ...(options.editingStyleSheets || [])].join(''))
    doc.head.append(styleEl)
  }

  private createLayout() {
    const workbench = createElement('div', {
      styles: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100%',
        background: '#fff'
      }
    })

    const iframe = CoreEditor.createEditableFrame()
    workbench.appendChild(iframe)

    return new Promise<{
      workbench: HTMLElement,
      iframe: HTMLIFrameElement,
      document: Document
    }>(resolve => {
      const html = getIframeHTML()
      iframe.onload = () => {
        const doc = iframe.contentDocument!
        doc.open()
        doc.write(html)
        doc.close()
        resolve({
          workbench,
          iframe,
          document: doc
        })
      }
      this.docContainer.appendChild(workbench)
    })
  }

  private static createEditableFrame() {
    return createElement('iframe', {
      attrs: {
        scrolling: 'no'
      },
      styles: {
        border: 'none',
        width: '100%',
        display: 'block',
        minHeight: '100%'
      }
    }) as HTMLIFrameElement
  }

  private static cssMin(str: string) {
    return str
      .replace(/\s*(?=[>{}:;,[])/g, '')
      .replace(/([>{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}').replace(/\s+/, ' ').trim()
  }
}
