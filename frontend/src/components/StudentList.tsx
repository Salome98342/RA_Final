import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Student } from '@/types'
import PaginationControls from '@/components/PaginationControls'

type Props = { students: Student[]; onSelect?: (s: Student) => void; selectedId?: string | number | null }
const DEFAULT_PAGE_SIZE = 10

const StudentList: React.FC<Props> = ({ students, onSelect, selectedId }) => {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [students])

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize))
  const visibleStudents = useMemo(() => {
    const start = (page - 1) * pageSize
    return students.slice(start, start + pageSize)
  }, [page, pageSize, students])

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
    <>
      <ul className="list-group ra-list-group" ref={listRef} onKeyDown={onKeyDown}>
        {visibleStudents.map((s) => {
          const isActive = selectedId != null && String(selectedId) === String(s.id)
          return (
            <li
              key={s.id}
              className={`list-group-item d-flex justify-content-between align-items-center ${isActive ? 'active' : ''}`.trim()}
              tabIndex={0}
              onClick={() => onSelect?.(s)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(s) } }}
              title="Seleccionar estudiante"
            >
              {s.name}
            </li>
          )
        })}
      </ul>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={students.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1)
          setPageSize(size)
        }}
        label="estudiantes"
        className="mt-2"
      />
    </>
  )
}

export default StudentList
