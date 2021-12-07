import { BlockFormatter, FormatType, VElement } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { blockTags } from './_config'

export class BlockStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: BlockFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  override match(p: HTMLElement) {
    const reg = new RegExp(`^(${blockTags.join('|')})$`, 'i')
    if (!reg.test(p.tagName)) {
      return false
    }
    return super.match(p)
  }

  read(node: HTMLElement) {
    return this.extractFormatData(node, {
      styleName: this.styleName
    }).styles[this.styleName]
  }
}

export class BlockStyleFormatter implements BlockFormatter {
  type: FormatType.Block = FormatType.Block

  constructor(public name: string,
              public styleName: string) {
  }

  render(node: VElement | null, formatValue: string): VElement | void {
    if (node) {
      node.styles.set(this.styleName, formatValue)
    } else {
      const el = new VElement('div')
      el.styles.set(this.styleName, formatValue)
      return el
    }
  }
}

// 块级样式
export const textIndentFormatter = new BlockStyleFormatter('textIndent', 'textIndent')
export const textAlignFormatter = new BlockStyleFormatter('textAlign', 'textAlign')
export const blockBackgroundColorFormatter = new BlockStyleFormatter('blockBackgroundColor', 'backgroundColor')
export const textIndentFormatLoader = new BlockStyleFormatLoader('textIndent', textIndentFormatter, {
  styles: {
    textIndent: /.+/
  }
})
export const textAlignFormatLoader = new BlockStyleFormatLoader('textAlign', textAlignFormatter, {
  styles: {
    textAlign: /.+/
  }
})

export const blockBackgroundColorFormatLoader = new BlockStyleFormatLoader('backgroundColor', blockBackgroundColorFormatter, {
  styles: {
    backgroundColor: /.+/
  }
})
