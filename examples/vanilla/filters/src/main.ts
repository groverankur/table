import './index.css'
import { createVanillaTable, fuzzyFilterFn, createFilteredRowModel, tableFeatures, columnFilteringFeature } from '@tanstack/vanilla-table'
import { makeData } from './makeData'

let data = makeData(50)

const columns = [
  {
    accessorKey: 'firstName',
    header: 'First Name',
    cell: (info: any) => info.getValue(),
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
    cell: (info: any) => info.getValue(),
  },
  {
    accessorKey: 'age',
    header: 'Age',
    cell: (info: any) => info.getValue(),
  },
  {
    accessorKey: 'visits',
    header: 'Visits',
    cell: (info: any) => info.getValue(),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info: any) => info.getValue(),
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    cell: (info: any) => info.getValue(),
  },
]

const table = createVanillaTable({
  data,
  columns,
  filterFns: {
    fuzzy: fuzzyFilterFn,
  },
  globalFilterFn: 'fuzzy',
  features: tableFeatures({
    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
  }),
  initialState: {
    columnFilters: [],
    globalFilter: '',
  },
})

// Setup stable DOM layout once
const wrapperElement = document.getElementById('wrapper') as HTMLDivElement
wrapperElement.innerHTML = ''

// Global Search Input
const searchHeader = document.createElement('div')
searchHeader.style.marginBottom = '15px'

const searchLabel = document.createElement('span')
searchLabel.textContent = 'Global Fuzzy Search: '

const searchInput = document.createElement('input')
searchInput.placeholder = 'Search first & last name...'
searchInput.oninput = (e) => {
  table.setGlobalFilter((e.target as HTMLInputElement).value)
}

searchHeader.appendChild(searchLabel)
searchHeader.appendChild(searchInput)
wrapperElement.appendChild(searchHeader)

// Create table element
const tableEl = document.createElement('table')
tableEl.border = '1'

const thead = document.createElement('thead')
const tbody = document.createElement('tbody')
tableEl.appendChild(thead)
tableEl.appendChild(tbody)
wrapperElement.appendChild(tableEl)

// Record count
const countDiv = document.createElement('div')
countDiv.style.marginTop = '10px'
wrapperElement.appendChild(countDiv)

// Render headers & filters once
const trHeaders = document.createElement('tr')
table.getHeaderGroups().forEach((headerGroup) => {
  headerGroup.headers.forEach((header) => {
    const th = document.createElement('th')
    th.textContent = header.isPlaceholder ? '' : String(header.column.columnDef.header || '')
    trHeaders.appendChild(th)
  })
})
thead.appendChild(trHeaders)

const trFilters = document.createElement('tr')
const filterInputs: Record<string, HTMLInputElement> = {}

table.getHeaderGroups().forEach((headerGroup) => {
  headerGroup.headers.forEach((header) => {
    const th = document.createElement('th')
    if (!header.isPlaceholder && header.column.getCanFilter()) {
      const filterInput = document.createElement('input')
      filterInput.placeholder = `Filter ${header.column.id}...`
      filterInput.style.width = '80%'
      filterInput.oninput = (e) => {
        header.column.setFilterValue((e.target as HTMLInputElement).value)
      }
      filterInputs[header.column.id] = filterInput
      th.appendChild(filterInput)
    } else {
      th.textContent = ''
    }
    trFilters.appendChild(th)
  })
})
thead.appendChild(trFilters)

// Render table contents dynamically
const renderTable = () => {
  // Update inputs only if they are not active to preserve focus / cursor position
  const currentGlobalFilter = (table.getState().globalFilter as string) || ''
  if (document.activeElement !== searchInput && searchInput.value !== currentGlobalFilter) {
    searchInput.value = currentGlobalFilter
  }

  table.getHeaderGroups().forEach((headerGroup) => {
    headerGroup.headers.forEach((header) => {
      const input = filterInputs[header.column.id]
      if (input) {
        const filterVal = (header.column.getFilterValue() as string) || ''
        if (document.activeElement !== input && input.value !== filterVal) {
          input.value = filterVal
        }
      }
    })
  })

  // Clear and rebuild only the tbody rows
  tbody.innerHTML = ''
  table.getRowModel().rows.forEach((row) => {
    const tr = document.createElement('tr')
    row.getAllCells().forEach((cell) => {
      const td = document.createElement('td')
      td.textContent = String(cell.getValue() ?? '')
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })

  countDiv.textContent = `Showing ${table.getRowModel().rows.length} of ${data.length} records`
}

table.subscribe(() => {
  renderTable()
})

// Initial draw
renderTable()
