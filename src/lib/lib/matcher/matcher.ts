import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../viewer/range';
import { CacheData } from '../toolbar/utils/cache-data';
import { Priority } from '../toolbar/help';
import { Single } from '../parser/single';
import { FormatRange } from '../parser/format';
import { NativeElement } from '../renderer/renderer';

interface MatchData {
  state: FormatState;
  cacheData: CacheData;
}

export enum MatchState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

export enum FormatState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Exclude = 'Exclude',
  Inherit = 'Inherit'
}

export interface MatchDelta {
  state: MatchState;
  fromRange: TBRange;
  cacheData: CacheData;
}

export interface CommonMatchDelta {
  state: MatchState;
  srcStates: MatchDelta[];
  cacheData: CacheData;
}

export interface MatchRule {
  tags?: string[] | RegExp;
  styles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // classes?: string[];
  attrs?: Array<{ key: string; value?: string | string[] }>;
  extendTags?: string[] | RegExp;
  excludeStyles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // excludeClasses?: string[];
  excludeAttrs?: Array<{ key: string; value?: string | string[] }>;
  noContainTags?: string[] | RegExp;
  noInTags?: string[] | RegExp;
  filter?: (node: NativeElement | CacheData) => boolean;
}

export class Matcher {
  private inheritValidators: Array<(node: NativeElement | CacheData) => boolean> = [];
  private validators: Array<(node: NativeElement | CacheData) => boolean> = [];
  private excludeValidators: Array<(node: NativeElement | CacheData) => boolean> = [];

  constructor(private rule: MatchRule = {}) {
    if (rule.extendTags) {
      this.inheritValidators.push(this.makeTagsMatcher(rule.extendTags));
    }
    if (rule.tags) {
      this.validators.push(this.makeTagsMatcher(rule.tags));
    }
    // if (rule.classes) {
    //   this.validators.push(this.makeClassNameMatcher(rule.classes));
    // }
    if (rule.styles) {
      this.validators.push(this.makeStyleMatcher(rule.styles));
    }
    if (rule.attrs) {
      this.validators.push(this.makeAttrsMatcher(rule.attrs));
    }
    // if (rule.excludeClasses) {
    //   this.excludeValidators.push(this.makeClassNameMatcher(rule.excludeClasses));
    // }
    if (rule.excludeStyles) {
      this.excludeValidators.push(this.makeStyleMatcher(rule.excludeStyles));
    }
    if (rule.excludeAttrs) {
      this.excludeValidators.push(this.makeAttrsMatcher(rule.excludeAttrs));
    }
  }

  matchData(data: CacheData): FormatState {
    return this.match(data);
  }

  matchNode(node: NativeElement): FormatState {
    return this.match(node);
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: MatchState.Normal,
        cacheData: null
      };
    }
    const srcStates: MatchDelta[] = selection.ranges.map(range => {

      const isDisable = this.getDisableStateByRange(range);

      if (isDisable) {
        return {
          state: MatchState.Disabled,
          fromRange: range,
          cacheData: null
        };
      }

      const states: MatchData[] = [];
      range.getSelectedScope().forEach(s => {
        const state = this.getStatesByRange(s.startIndex,
          s.endIndex,
          s.context,
          handler);
        if (state.state === FormatState.Invalid) {
          const inSingleContainer = Matcher.inSingleContainer(s.context, handler, s.startIndex, s.endIndex);
          if (inSingleContainer.state !== FormatState.Invalid) {
            states.push(inSingleContainer);
          } else {
            states.push(state);
          }
        } else {
          states.push(state);
        }
      });
      let mergedState = Matcher.mergeStates(states) || {state: FormatState.Invalid, cacheData: null};
      return {
        state: (mergedState.state === FormatState.Valid || mergedState.state === FormatState.Inherit) ?
          MatchState.Highlight : MatchState.Normal,
        fromRange: range,
        cacheData: mergedState.cacheData
      };
    });
    let isDisable = false;
    for (const i of srcStates) {
      if (i.state === MatchState.Disabled) {
        isDisable = true;
        break;
      }
    }

    return {
      state: isDisable ? MatchState.Disabled :
        srcStates.reduce((v, n) => v && n.state === MatchState.Highlight, true) ?
          MatchState.Highlight :
          MatchState.Normal,
      srcStates,
      cacheData: srcStates[0].cacheData
    };
  }

  private match(p: NativeElement | CacheData) {
    if (this.rule.filter) {
      const b = this.rule.filter(p);
      if (!b) {
        return FormatState.Invalid;
      }
    }
    const exclude = this.excludeValidators.map(fn => fn(p)).includes(true);
    if (exclude) {
      return FormatState.Exclude;
    }
    const inherit = this.inheritValidators.map(fn => fn(p)).includes(true);
    if (inherit) {
      return FormatState.Inherit;
    }
    return this.validators.map(fn => fn(p)).includes(true) ? FormatState.Valid : FormatState.Invalid;
  }

  private getDisableStateByRange(range: TBRange) {
    return this.isInTag(range.commonAncestorFragment) ||
      this.isContainTag(range.commonAncestorFragment, range.getCommonAncestorFragmentScope());
  }

  private isInTag(fragment: Fragment): boolean {
    if (!fragment) {
      return false;
    }
    return this.isDisable(fragment, this.rule.noInTags) || this.isInTag(fragment.parent);
  }

  private isContainTag(fragment: Fragment, position: { startIndex: number, endIndex: number }): boolean {
    const elements = fragment.sliceContents(position.startIndex, position.endIndex)
      .filter(item => item instanceof Fragment) as Fragment[];
    for (let el of elements) {
      if (this.isDisable(el, this.rule.noContainTags) ||
        this.isContainTag(el, {startIndex: 0, endIndex: el.contentLength})) {
        return true;
      }
    }
    return false;
  }

  private isDisable(fragment: Fragment, tags: string[] | RegExp) {
    const formats = fragment.getFormatRanges()
      .filter(item => [Priority.Default, Priority.Block].includes(item.handler.priority));

    for (const f of formats) {
      if (f.cacheData) {
        if (Array.isArray(tags)) {
          if (tags.includes(f.cacheData.tag)) {
            return true;
          }
        } else if (tags instanceof RegExp) {
          if (tags.test(f.cacheData.tag)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getStatesByRange(startIndex: number, endIndex: number, fragment: Fragment, handler: Handler): MatchData {
    let formatRanges = fragment.getFormatRangesByHandler(handler) || [];

    if ([Priority.Default, Priority.Block].includes(handler.priority)) {
      if (formatRanges.length) {
        const first = formatRanges[0];
        if (first.state !== FormatState.Invalid) {
          return {
            state: first.state,
            cacheData: first?.cacheData.clone() || null
          }
        }
      }
    }

    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        // 如果为块级元素，则需要从第 0 位开始匹配
        if (format.startIndex === 0 &&
          format.endIndex === fragment.contentLength &&
          (format.handler.priority === Priority.Block || format.handler.priority === Priority.BlockStyle)) {
          if (startIndex >= format.startIndex && startIndex <= format.endIndex) {
            return {
              state: format.state,
              cacheData: format?.cacheData.clone() || null
            };
          }
        }
        if ((startIndex === 0 && startIndex === format.startIndex) || (startIndex > format.startIndex && startIndex <= format.endIndex)) {
          return {
            state: format.state,
            cacheData: format?.cacheData.clone() || null
          };
        }
      }
      return {
        state: FormatState.Invalid,
        cacheData: null
      };
    }

    const childContents = fragment.sliceContents(startIndex, endIndex);
    const states: Array<MatchData> = [];
    let index = startIndex;
    formatRanges = formatRanges.filter(item => {
      return !(item.endIndex <= startIndex || item.startIndex >= endIndex);
    });

    for (const child of childContents) {
      if (typeof child === 'string' || child instanceof Single) {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === FormatState.Exclude) {
              return {
                state: FormatState.Exclude,
                cacheData: format?.cacheData.clone() || null
              };
            } else {
              states.push({
                state: format.state,
                cacheData: format?.cacheData.clone() || null
              });
            }
          } else {
            states.push({
              state: FormatState.Invalid,
              cacheData: null
            })
          }
        }
        if (child instanceof Single) {
          const formats = child.getFormatRangesByHandler(handler);
          if (formats && formats[0]) {
            return {
              state: formats[0].state,
              cacheData: formats[0].cacheData
            };
          }
        }
        if (!formatRanges.length) {
          return {
            state: FormatState.Invalid,
            cacheData: null
          };
        }
      } else if (child instanceof Fragment) {
        if (child.contentLength) {
          states.push(this.getStatesByRange(0, child.contentLength, child, handler));
        }
      }
      index += child.length;
    }
    return Matcher.mergeStates(states);
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: NativeElement | CacheData) => {
      const tagName = node instanceof CacheData ? node.tag : node.nodeName.toLowerCase();
      return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName);
    };
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: NativeElement | CacheData) => {
      return attrs.map(attr => {
        if (attr.value) {
          if (node instanceof CacheData) {
            return node?.attrs.get(attr.key) === attr.value;
          }
          if (node instanceof HTMLElement) {
            return node.getAttribute(attr.key) === attr.value;
          }
        } else {
          if (node instanceof CacheData) {
            return node?.attrs.has(attr.key);
          }
          if (node instanceof HTMLElement) {
            return node.hasAttribute(attr.key);
          }
        }
        return false;
      }).includes(true);
    }
  }

  // private makeClassNameMatcher(classes: string[]) {
  //   return (node: HTMLElement | CacheData | CacheDataParams) => {
  //     return classes.map(className => {
  //       return node.classList.contains(className);
  //     }).includes(true);
  //   };
  // }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: NativeElement | CacheData) => {
      const elementStyles = node.style;
      if (!elementStyles) {
        return false;
      }
      return !Object.keys(styles).map(key => {
        const optionValue = (Array.isArray(styles[key]) ?
          styles[key] :
          [styles[key]]) as Array<string | number | RegExp>;
        let styleValue = elementStyles[key];
        if (key === 'fontFamily' && typeof styleValue === 'string') {
          styleValue = styleValue.replace(/['"]/g, '');
        }
        return optionValue.map(v => {
          if (v instanceof RegExp) {
            return v.test(styleValue);
          }
          return v === styleValue;
        }).includes(true);
      }).includes(false);
    }
  }

  private static mergeStates(states: MatchData[]): MatchData {
    states = states.filter(i => i);
    for (const item of states) {
      if (item.state === FormatState.Exclude) {
        return {
          state: FormatState.Exclude,
          cacheData: item.cacheData ? item.cacheData.clone() : null
        };
      } else if (item.state === FormatState.Invalid) {
        return {
          state: FormatState.Invalid,
          cacheData: item.cacheData ? item.cacheData.clone() : null
        };
      }
    }
    const last = states[states.length - 1];

    return states.length ? {
      state: last.state,
      cacheData: states.length === 1 && last.cacheData ? last.cacheData.clone() : null
    } : null;
  }

  private static inSingleContainer(fragment: Fragment,
                                   handler: Handler, startIndex: number, endIndex: number): MatchData {

    while (true) {
      const formatRanges = fragment.getFormatRangesByHandler(handler) || [];
      const states: FormatRange[] = [];
      for (const f of formatRanges) {
        if (startIndex >= f.startIndex && endIndex <= f.endIndex) {
          states.push(f);
        }
      }

      for (const item of states) {
        if (item.state === FormatState.Exclude) {
          return {
            state: FormatState.Exclude,
            cacheData: item.cacheData.clone()
          }
        }
      }
      for (const item of states) {
        if (item.state === FormatState.Valid) {
          return {
            state: FormatState.Valid,
            cacheData: item.cacheData.clone()
          }
        }
      }
      if (fragment.parent) {
        startIndex = fragment.parent.sliceContents(0).indexOf(fragment);
        endIndex = startIndex + 1;
        fragment = fragment.parent;
      } else {
        break;
      }
    }
    return {
      state: FormatState.Invalid,
      cacheData: null
    };
  }
}
