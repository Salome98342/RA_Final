import React from 'react'

const CardGrid: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="cards-grid">{children}</div>
)

export default CardGrid
