import React from 'react'
import type { Student } from '@/types'

type Props = { students: Student[]; onSelect?: (s: Student) => void }
const StudentList: React.FC<Props> = ({ students, onSelect }) => (
  <ul className="list-group ra-list-group">
    {students.map((s, i) => (
      <li
        key={s.id}
        className={`list-group-item d-flex justify-content-between align-items-center${i===0?' active text-white':''}`}
        role={onSelect ? 'button' : undefined}
        onClick={() => onSelect?.(s)}
        title="Seleccionar estudiante"
      >
        {s.name}
      </li>
    ))}
  </ul>
)

export default StudentList
