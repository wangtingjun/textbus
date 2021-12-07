import { Injector } from '@tanbo/di'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import {
  Component,
  ComponentInstance,
  ContentType,
  defineComponent, onContextMenu,
  Slot,
  SlotLiteral,
  SlotRender,
  Translator, useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { I18n } from '../i18n'

export interface TableCellLiteral {
  colspan: number
  rowspan: number
}

export interface TableCellPosition {
  beforeCell: TableCellSlot | null
  afterCell: TableCellSlot | null;
  row: TableCellSlot[];
  cell: TableCellSlot,
  rowIndex: number;
  columnIndex: number;
  offsetColumn: number;
  offsetRow: number;
}

export interface TableRowPosition {
  cells: TableCellSlot[];
  beforeRow: TableCellSlot[];
  afterRow: TableCellSlot[];
  cellsPosition: TableCellPosition[];
}

export interface TableCellRect {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
}

export interface TableRange {
  startPosition: TableCellPosition;
  endPosition: TableCellPosition;
  selectedCells: Slot[];
}


export interface TableComponentInstance extends ComponentInstance<TableLiteral> {
  selectCells(startSlot: TableCellSlot, endSlot: TableCellSlot): TableRange
}

export interface TableConfig {
  useTextBusStyle: boolean
  cells: TableCellSlot[][]
}

export interface TableLiteral {
  useTextBusStyle: boolean
  cells: SlotLiteral<TableCellLiteral>[][]
}

export class TableCellSlot extends Slot<TableCellLiteral> {
  constructor(colspan = 1, rowspan = 1) {
    super([
      ContentType.Text
    ], {
      colspan,
      rowspan
    })
  }
}

function serialize(bodies: TableCellSlot[][]): TableRowPosition[] {
  const rows: TableRowPosition[] = []

  for (let i = 0; i < bodies.length; i++) {
    const cells: TableCellPosition[] = []
    bodies[i].forEach((cell, index) => {
      cells.push({
        row: bodies[i],
        beforeCell: bodies[i][index - 1],
        afterCell: bodies[i][index + 1],
        offsetColumn: 0,
        offsetRow: 0,
        columnIndex: index,
        rowIndex: i,
        cell
      })
    })
    rows.push({
      beforeRow: bodies[i - 1] || null,
      afterRow: bodies[i + 1] || null,
      cellsPosition: cells,
      cells: bodies[i]
    })
  }

  let stop = false
  let columnIndex = 0
  const marks: string[] = []
  do {
    let rowIndex = 0
    stop = false
    while (rowIndex < rows.length) {
      const row = rows[rowIndex]
      const cellPosition = row.cellsPosition[columnIndex]
      if (cellPosition) {
        let mark: string
        cellPosition.rowIndex = rowIndex
        cellPosition.columnIndex = columnIndex

        if (cellPosition.offsetColumn + 1 < cellPosition.cell.state!.colspan) {
          mark = `${rowIndex}*${columnIndex + 1}`
          if (marks.indexOf(mark) === -1) {
            row.cellsPosition.splice(columnIndex + 1, 0, {
              beforeCell: cellPosition.beforeCell,
              afterCell: cellPosition.afterCell,
              cell: cellPosition.cell,
              row: row.cells,
              rowIndex,
              columnIndex,
              offsetColumn: cellPosition.offsetColumn + 1,
              offsetRow: cellPosition.offsetRow
            })
            marks.push(mark)
          }
        }
        if (cellPosition.offsetRow + 1 < cellPosition.cell.state!.rowspan) {
          mark = `${rowIndex + 1}*${columnIndex}`
          if (marks.indexOf(mark) === -1) {
            let nextRow = rows[rowIndex + 1]
            if (!nextRow) {
              nextRow = {
                ...row,
                cells: [],
                cellsPosition: []
              }
              rows.push(nextRow)
            }
            const newRowBeforeColumn = nextRow.cellsPosition[columnIndex - 1]
            const newRowAfterColumn = nextRow.cellsPosition[columnIndex]
            nextRow.cellsPosition.splice(columnIndex, 0, {
              beforeCell: newRowBeforeColumn ? newRowBeforeColumn.cell : null,
              afterCell: newRowAfterColumn ? newRowAfterColumn.cell : null,
              row: nextRow.cells,
              cell: cellPosition.cell,
              offsetColumn: cellPosition.offsetColumn,
              offsetRow: cellPosition.offsetRow + 1,
              rowIndex,
              columnIndex,
            })
            marks.push(mark)
          }
        }
        stop = true
      }
      rowIndex++
    }
    columnIndex++
  } while (stop)
  return rows
}

function findCellPosition(cell: TableCellSlot, cellMatrix: TableRowPosition[]): TableCellRect {
  let minRow!: number, maxRow!: number, minColumn!: number, maxColumn!: number

  forA:for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
    const cells = cellMatrix[rowIndex].cellsPosition
    for (let colIndex = 0; colIndex < cells.length; colIndex++) {
      if (cells[colIndex].cell === cell) {
        minRow = rowIndex
        minColumn = colIndex
        break forA
      }
    }
  }

  forB:for (let rowIndex = cellMatrix.length - 1; rowIndex > -1; rowIndex--) {
    const cells = cellMatrix[rowIndex].cellsPosition
    for (let colIndex = cells.length - 1; colIndex > -1; colIndex--) {
      if (cells[colIndex].cell === cell) {
        maxRow = rowIndex
        maxColumn = colIndex
        break forB
      }
    }
  }

  return {
    minRow,
    maxRow,
    minColumn,
    maxColumn
  }
}

function selectCellsByRange(minRow: number, minColumn: number, maxRow: number, maxColumn: number, cellMatrix: TableRowPosition[]): TableRange {
  const x1 = -Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => row.cellsPosition[minColumn].offsetColumn))
  const x2 = Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => {
    return row.cellsPosition[maxColumn].cell.state!.colspan - (row.cellsPosition[maxColumn].offsetColumn + 1)
  }))
  const y1 = -Math.max(...cellMatrix[minRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => cell.offsetRow))
  const y2 = Math.max(...cellMatrix[maxRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => {
    return cell.cell.state!.rowspan - (cell.offsetRow + 1)
  }))

  if (x1 || y1 || x2 || y2) {
    return selectCellsByRange(minRow + y1, minColumn + x1, maxRow + y2, maxColumn + x2, cellMatrix)
  }

  const startCellPosition = cellMatrix[minRow].cellsPosition[minColumn]
  const endCellPosition = cellMatrix[maxRow].cellsPosition[maxColumn]

  const selectedCells = cellMatrix.slice(startCellPosition.rowIndex, endCellPosition.rowIndex + 1).map(row => {
    return row.cellsPosition.slice(startCellPosition.columnIndex, endCellPosition.columnIndex + 1)
  }).reduce((a, b) => {
    return a.concat(b)
  }).map(item => item.cell)

  return {
    selectedCells: Array.from(new Set(selectedCells)),
    startPosition: startCellPosition,
    endPosition: endCellPosition
  }
}

export const tableComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TableComponent',
  transform(translator: Translator, state: TableLiteral): TableConfig {
    return {
      cells: state.cells.map<TableCellSlot[]>(i => {
        return i.map<TableCellSlot>(j => {
          const slot = new TableCellSlot(j.state!.colspan, j.state!.rowspan)
          return translator.fillSlot(j, slot)
        })
      }),
      useTextBusStyle: state.useTextBusStyle
    }
  },
  setup(config: TableConfig): TableComponentInstance {
    const tableCells = config.cells
    const injector = useContext()
    const i18n = injector.get(I18n)

    const slots = useSlots<TableCellSlot, SlotLiteral<TableCellLiteral>>(tableCells.flat(), state => {
      return new TableCellSlot(state.state!.colspan, state.state!.rowspan)
    })

    let serializedCells = serialize(tableCells)

    onContextMenu(() => {
      return [{
        iconClasses: ['textbus-icon-table-add-column-left'],
        label: i18n.get('components.tableComponent.addColumnToLeft'),
        onClick() {
          // instance.addColumnToLeft(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-add-column-right'],
        label: i18n.get('components.tableComponent.addColumnToRight'),
        onClick() {
          // instance.addColumnToRight(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-add-row-top'],
        label: i18n.get('components.tableComponent.insertRowBefore'),
        onClick() {
          // instance.addRowToTop(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-add-row-bottom'],
        label: i18n.get('components.tableComponent.insertRowAfter'),
        onClick() {
          // instance.addRowToBottom(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-delete-column-left'],
        label: i18n.get('components.tableComponent.deleteColumns'),
        onClick() {
          // instance.deleteLeftColumn(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-delete-row-top'],
        label: i18n.get('components.tableComponent.deleteRows'),
        onClick() {
          // instance.deleteTopRow(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table-split-columns'],
        label: i18n.get('components.tableComponent.mergeCells'),
        onClick() {
          // instance.mergeCells(selection)
        }
      }, {
        iconClasses: ['textbus-icon-table'],
        label: i18n.get('components.tableComponent.splitCells'),
        onClick() {
          // instance.splitCells(selection)
        }
      }]
    })

    const instance: TableComponentInstance = {
      selectCells(startCell: TableCellSlot, endCell: TableCellSlot) {
        serializedCells = serialize(tableCells)
        const p1 = findCellPosition(startCell, serializedCells)
        const p2 = findCellPosition(endCell, serializedCells)
        const minRow = Math.min(p1.minRow, p2.minRow)
        const minColumn = Math.min(p1.minColumn, p2.minColumn)
        const maxRow = Math.max(p1.maxRow, p2.maxRow)
        const maxColumn = Math.max(p1.maxColumn, p2.maxColumn)
        return selectCellsByRange(minRow, minColumn, maxRow, maxColumn, serializedCells)
      },
      render(isOutputMode: boolean, slotRender: SlotRender) {
        const table = new VElement('table')
        if (config.useTextBusStyle) {
          table.classes.add('tb-table')
        }
        if (tableCells.length) {
          const body = new VElement('tbody')
          table.appendChild(body)
          for (const row of tableCells) {
            const tr = new VElement('tr')
            body.appendChild(tr)
            for (const col of row) {
              tr.appendChild(slotRender(col, () => {
                const td = new VElement('td')
                if (col.state!.colspan > 1) {
                  td.attrs.set('colspan', col.state?.colspan)
                }
                if (col.state!.rowspan > 1) {
                  td.attrs.set('rowspan', col.state?.rowspan)
                }
                return td
              }))
            }
          }
        }
        return table
      },
      toJSON(): TableLiteral {
        return {
          useTextBusStyle: config.useTextBusStyle,
          cells: tableCells.map(i => {
            return i.map(j => {
              return j.toJSON()
            })
          })
        }
      }
    }
    return instance
  }
})

export const tableComponentLoader: ComponentLoader = {
  metadata: {
    styles: [`
    td,th{border-width: 1px; border-style: solid;}
   table {border-spacing: 0; border-collapse: collapse; width: 100%; }
   .tb-table td, th {border-color: #aaa;}`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'TABLE'
  },
  read(element: HTMLTableElement, injector: Injector, slotParser: SlotParser): Component {
    const {tHead, tBodies, tFoot} = element
    const headers: TableCellSlot[][] = []
    const bodies: TableCellSlot[][] = []
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: TableCellSlot[] = []
        headers.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new TableCellSlot(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || {rows: []}).reduce((value, next) => {
        return value.concat(Array.from(next.rows))
      }, [] as HTMLTableRowElement[]).forEach((row: HTMLTableRowElement) => {
        const arr: TableCellSlot[] = []
        bodies.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new TableCellSlot(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }
    bodies.unshift(...headers)
    return tableComponent.createInstance(injector, {
      cells: bodies,
      useTextBusStyle: element.classList.contains('tb-table')
    })
  },
  component: tableComponent
}
