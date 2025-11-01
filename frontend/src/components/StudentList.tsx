import React from 'react'
import type { Student } from '@/types'

type Props = { students: Student[]; onSelect?: (s: Student) => void }
const StudentList: React.FC<Props> = ({ students, onSelect }) => (
  <ul className="list-group ra-list-group">
    {students.map((s, i) => {
      const className = `list-group-item d-flex justify-content-between align-items-center${i === 0 ? ' active text-white' : ''}`
      if (onSelect) {
        return (
          <li
            key={s.id}
            className={className}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(s)}
            title="Seleccionar estudiante"
          >
            {s.name}
          </li>
        )
      }

      return (
        <li
          key={s.id}
          className={className}
          title="Seleccionar estudiante"
        >
          {s.name}
        </li>
      )
    })}
  </ul>
)

export default StudentList
