import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class ReplaceModel {
  constructor(public replaceElement: HTMLElement) {
  }
}

export class ChildSlotModel {
  constructor(public slotElement: HTMLElement) {
  }
}

export type RenderModel = ReplaceModel | ChildSlotModel | null;

export interface Commander {
  command(selection: TBSelection, handler: Handler, overlap: boolean): void;

  render(state: FormatState, rawElement?: HTMLElement): RenderModel;
}

export interface UpdateCommander extends Commander {
  updateValue(value: string): void;
}