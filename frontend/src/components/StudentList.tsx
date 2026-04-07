import React, { useRef } from 'react'
import type { Student } from '@/types'

type Props = { students: Student[]; onSelect?: (s: Student) => void }
const StudentList: React.FC<Props> = ({ students, onSelect }) => {
  const listRef = useRef<HTMLUListElement | null>(null)

  const onKeyDown: React.KeyboardEventHandler<HTMLUListElement> = (e) => {
    const keys = ['ArrowUp', 'ArrowDown']
    if (!keys.includes(e.key)) return
    if (!listRef.current) return
    const items = Array.from(listRef.current.querySelectorAll<HTMLLIElement>('li[tabindex="0"]'))
    if (items.length === 0) return
    const active = document.activeElement as HTMLElement | null
    const idx = Math.max(0, items.findIndex(el => el === active))
    let next = idx
    if (e.key === 'ArrowDown') next = Math.min(items.length - 1, idx + 1)
    if (e.key === 'ArrowUp') next = Math.max(0, idx - 1)
    if (next !== idx) { e.preventDefault(); items[next].focus() }
  }

  return (
    <ul className="list-group ra-list-group" ref={listRef} onKeyDown={onKeyDown}>
      {students.map((s) => (
        <li
          key={s.id}
          className="list-group-item d-flex justify-content-between align-items-center"
          tabIndex={0}
          onClick={() => onSelect?.(s)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(s) } }}
          title="Seleccionar estudiante"
        >
          {s.name}
        </li>
      ))}
    </ul>
  )
}

export default StudentList
