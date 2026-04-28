import React from 'react'

type Props = {
  page: number
  totalPages: number
  totalItems: number
  totalUnfiltered?: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  label?: string
  className?: string
}

const PaginationControls: React.FC<Props> = ({
  page,
  totalPages,
  totalItems,
  totalUnfiltered,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [100, 50, 25, 10],
  label = 'registros',
  className = '',
}) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems)

  return (
    <div className={`d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 ${className}`.trim()}>
      <div className="d-flex align-items-center gap-2">
        <small className="text-muted">Mostrar</small>
        <select
          className="form-select form-select-sm"
          style={{ width: 88 }}
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          disabled={!onPageSizeChange}
          aria-label={`Cantidad de ${label} por página`}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <small className="text-muted">entradas</small>
      </div>
      <small className="text-muted">
        Mostrando {from} a {to} de {totalItems} entradas
        {typeof totalUnfiltered === 'number' && totalUnfiltered !== totalItems
          ? ` (filtrado de ${totalUnfiltered} entradas)`
          : ''}
      </small>
      <div className="btn-group btn-group-sm" role="group" aria-label={`Paginación de ${label}`}>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <i className="bi bi-chevron-left me-1" aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <i className="bi bi-chevron-right ms-1" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default PaginationControls