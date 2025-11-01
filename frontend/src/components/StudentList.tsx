import React from 'react'
import type { Student } from '@/types'

type Props = { students: Student[]; onSelect?: (s: Student) => void }
const StudentList: React.FC<Props> = ({ students, onSelect }) => (
  <ul className="list-group ra-list-group">
    {students.map((s, i) => (
      <li
        key={s.id}
        className={`list-group-item d-flex justify-content-between align-items-center${i===0?' active text-white':''}`}
      >
        {onSelect ? (
          <button
            type="button"
            className="btn btn-link p-0 text-start w-100"
            onClick={() => onSelect(s)}
            title="Seleccionar estudiante"
          >
            {s.name}
          </button>
        ) : (
          <span>{s.name}</span>
        )}
      </li>
    ))}
  </ul>
)

export default StudentList
