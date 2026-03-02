import React, { useId, useState } from 'react'

type Props = { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }
const Dropdown: React.FC<Props> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.find((o) => o.value === value)?.label ?? value
  
  return (
    // eslint-disable-next-line jsx-a11y/aria-props, axe/aria
    <div
      className="dropdown"
      tabIndex={0}
      onBlur={() => setOpen(false)}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={listId}
      aria-label="Selector"
    >
      <div
        className="dropdown-selected"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) }
          if (e.key === 'Escape') setOpen(false)
        }}
        onClick={() => setOpen((o) => !o)}
      >{selected}</div>
      {open && (
        <ul className="dropdown-list" id={listId} role="listbox" aria-label="Opciones">
          {options.map((o) => (
            // eslint-disable-next-line jsx-a11y/aria-props, axe/aria
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value ? 'true' : 'false'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(o.value); setOpen(false) } }}
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
            >{o.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dropdown
