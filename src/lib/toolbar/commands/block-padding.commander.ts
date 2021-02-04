import { CommandContext, Commander, FormatData, FormatEffect } from '../../core/_api';
import {
  BlockPaddingFormatter,
} from '../../formatter/_api';

export class BlockPaddingCommander implements Commander<Map<string, string>> {
  recordHistory = true;

  constructor(private formatter: BlockPaddingFormatter) {
  }

  command(context: CommandContext, params: Map<string, string>) {
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(scope => {
        scope.fragment.apply(this.formatter, {
          effect: Array.from(params.values()).filter(i => i).length ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: 0,
          endIndex: scope.fragment.contentLength,
          formatData: new FormatData({
            styles: {
              paddingTop: params.get('paddingTop'),
              paddingRight: params.get('paddingRight'),
              paddingBottom: params.get('paddingBottom'),
              paddingLeft: params.get('paddingLeft'),
            }
          })
        })
      })
    })
  }
}
