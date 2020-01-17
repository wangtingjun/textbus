import { merge, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActionSheetConfig, ActionConfig, EditableOptions } from '../help';
import { Dropdown } from './utils/dropdown';
import { Handler } from './help';
import { CommonMatchDelta, Matcher, MatchState } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { Hook } from '../../viewer/help';
import { Keymap } from '../../viewer/events';

export class ActionSheetHandler implements Handler {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;
  keymap: Keymap[] = [];

  private matchedEvent = new Subject<ActionConfig>();
  private options: ActionSheetOptionHandler[] = [];
  private eventSource = new Subject<any>();
  private dropdown: Dropdown;

  constructor(private config: ActionSheetConfig) {
    this.priority = config.priority;
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();
    this.execCommand = config.execCommand;
    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
    this.hook = config.hook;

    const dropdownButton = document.createElement('span');
    dropdownButton.classList.add(...config.classes || []);

    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-toolbar-menu');

    config.actions.forEach(option => {
      const item = new ActionSheetOptionHandler(option);
      menu.appendChild(item.elementRef);
      this.options.push(item);
      if (option.keymap) {
        this.keymap.push({
          config: option.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              config.execCommand.actionType = option.value;
              this.eventSource.next();
            }
          }
        })
      }
    });

    this.dropdown = new Dropdown(
      dropdownButton,
      menu,
      merge(...this.options.map(item => item.onCheck)).pipe(map(v => {
        config.execCommand.actionType = v;
        this.eventSource.next();
        return v;
      })),
      config.tooltip
    );
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    switch (commonMatchDelta.state) {
      case MatchState.Highlight:
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        break;
      case MatchState.Normal:
        this.dropdown.disabled = false;
        this.dropdown.highlight = false;
        break;
      case MatchState.Disabled:
        this.dropdown.disabled = true;
        this.dropdown.highlight = false;
        break
    }
  }
}

export class ActionSheetOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private option: ActionConfig) {
    this.onCheck = this.eventSource.asObservable();
    this.elementRef.classList.add('tanbo-editor-toolbar-menu-item');
    this.elementRef.type = 'button';
    const label = document.createElement('span');
    label.classList.add('tanbo-editor-toolbar-menu-item-label');
    if (option.classes) {
      label.classList.add(...(option.classes || []));
    }
    label.innerText = option.label;
    this.elementRef.appendChild(label);
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option.value);
    });
  }
}
