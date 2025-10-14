import type { ReactNode } from 'react'

type Props = { headTone?: 'dark' | 'light'; title: ReactNode; subtitle?: ReactNode; onClick?: () => void; ariaLabel?: string }

const RaCard = ({ headTone = 'light', title, subtitle, onClick, ariaLabel }: Props) => (
  <div
    className="ra-card"
    role="button"
    tabIndex={0}
    aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
    onClick={onClick}
    onKeyDown={(e) => {
      if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick() }
    }}
  >
    <div className={`ra-card-head ${headTone === 'dark' ? 'bg-secondary' : 'bg-secondary-subtle'}`} />
    <div className="ra-card-body">
      <div>{title}</div>
      {subtitle && <div className="ra-small">{subtitle}</div>}
    </div>
  </div>
)

export default RaCard
