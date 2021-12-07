import { Injector } from '@tanbo/di'
import { Query, QueryState, QueryStateType, FormatValue, Commander } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { dirFormatter } from '../../formatters/_api'

export function rightToLeftToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-rtl'],
    tooltip: i18n.get('plugins.toolbar.rightToLeftTool.tooltip'),
    queryState(): QueryState<FormatValue> {
      const state = query.queryFormat(dirFormatter)
      return {
        state: state.value === 'rtl' ? QueryStateType.Enabled : QueryStateType.Normal,
        value: state.value
      }
    },
    onClick() {
      const state = query.queryFormat(dirFormatter)
      const b = state.value === 'rtl'
      b ? commander.unApplyFormat(dirFormatter) : commander.applyFormat(dirFormatter, true)
    }
  }
}

export const rightToLeftTool = new ButtonTool(rightToLeftToolConfigFactory)
