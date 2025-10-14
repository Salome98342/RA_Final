import React, { useState } from 'react'

type Props = { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }
const Dropdown: React.FC<Props> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)?.label ?? value
  return (
    <div className="dropdown" tabIndex={0} onBlur={() => setOpen(false)}>
      <div className="dropdown-selected" onClick={() => setOpen((o) => !o)}>{selected}</div>
      {open && (
        <ul className="dropdown-list">
          {options.map((o) => (
            <li key={o.value} onMouseDown={() => { onChange(o.value); setOpen(false) }}>{o.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dropdown
