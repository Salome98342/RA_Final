import React from 'react'

type Props = { icon: string; placeholder?: string; value?: string; onChange?: (v: string) => void; label?: string }
const SearchPill: React.FC<Props> = ({ icon, placeholder, value, onChange, label }) => {
  return (
    <div className="search-pill mb-3">
      <i className={`bi ${icon}`} />
      {label ? <div className="pill-label">{label}</div> : (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          type="text"
          placeholder={placeholder}
          aria-label={label ?? placeholder ?? 'Buscar'}
          role="searchbox"
        />
      )}
    </div>
  )
}

export default SearchPill
