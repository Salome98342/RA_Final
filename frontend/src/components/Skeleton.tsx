import React from 'react'

type Props = { width?: number | string; height?: number | string; rounded?: boolean; className?: string }

const Skeleton: React.FC<Props> = ({ width = '100%', height = 16, rounded = true, className }) => (
  <div
    className={`skeleton ${rounded ? 'skeleton-rounded' : ''} ${className ?? ''}`}
    style={{ width, height }}
    aria-hidden="true"
  />
)

export const SkeletonCard: React.FC = () => (
  <div className="ra-card" aria-hidden>
    <div className="ra-card-head bg-secondary-subtle" />
    <div className="ra-card-body">
      <Skeleton width="80%" height={14} />
      <Skeleton width="60%" height={12} className="mt-2" />
    </div>
  </div>
)

export default Skeleton
