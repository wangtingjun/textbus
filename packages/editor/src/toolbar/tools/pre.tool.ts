import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType, TBSelection } from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { preComponent } from '../../components/pre.component'
import { I18n } from '../../i18n'

export function preToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const selection = injector.get(TBSelection)
  return {
    iconClasses: ['textbus-icon-terminal'],
    tooltip: i18n.get('plugins.toolbar.preTool.tooltip'),
    mini: true,
    options: [{
      label: 'JavaScript',
      value: 'JavaScript',
    }, {
      label: 'HTML',
      value: 'HTML'
    }, {
      label: 'CSS',
      value: 'CSS'
    }, {
      label: 'TypeScript',
      value: 'TypeScript'
    }, {
      label: 'Java',
      value: 'Java'
    }, {
      label: 'C',
      value: 'C'
    }, {
      label: 'C++',
      value: 'CPP'
    }, {
      label: 'C#',
      value: 'CSharp'
    }, {
      label: 'Swift',
      value: 'Swift'
    }, {
      label: 'Go',
      value: 'Go'
    }, {
      label: 'JSON',
      value: 'JSON'
    }, {
      label: 'Less',
      value: 'Less'
    }, {
      label: 'SCSS',
      value: 'SCSS'
    }, {
      label: 'Stylus',
      value: 'Stylus'
    }, {
      label: 'Shell',
      value: '',
      default: true
    }],
    queryState(): QueryState<any> {
      const state = query.queryComponent(preComponent)
      return {
        state: state.state,
        value: state.value ? state.value.instance.toJSON().lang : null
      }
    },
    onChecked(value: any) {
      const state = query.queryComponent(preComponent)
      if (state.state === QueryStateType.Enabled) {
        state.value!.useState(value)
      } else {
        const component = preComponent.createInstance(injector, {
          lang: value,
          code: ''
        })
        commander.insert(component)
        selection.setLocation(component.slots.get(0)!, 0)
      }
    }
  }
}

export const preTool = new SelectTool(preToolConfigFactory)
