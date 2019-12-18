import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { EditableOptions } from '../utils/cache-data';
import { Hook } from '../help';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: EditableOptions;
  hook?: Hook;
  updateStatus?(commonMatchDelta: CommonMatchDelta): void;
}
