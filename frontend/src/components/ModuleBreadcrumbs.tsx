import React from 'react'

type BreadcrumbItem = {
  label: string
  to?: string
}

type ModuleBreadcrumbsProps = {
  items: BreadcrumbItem[]
  onNavigate: (to: string) => void
}

const ModuleBreadcrumbs: React.FC<ModuleBreadcrumbsProps> = ({ items, onNavigate }) => {
  if (!items.length) return null

  return (
    <nav aria-label="Migas de pan" className="mb-3">
      <ol className="breadcrumb small mb-0">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li
              key={`${item.label}-${idx}`}
              className={`breadcrumb-item${isLast ? ' active' : ''}`}
              aria-current={isLast ? 'page' : undefined}
            >
              {!isLast && item.to ? (
                <button
                  type="button"
                  className="btn btn-link p-0 align-baseline text-decoration-none"
                  onClick={() => onNavigate(item.to as string)}
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ModuleBreadcrumbs
