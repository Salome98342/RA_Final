import React, { useRef } from 'react'

// Keyboard-friendly grid: arrow keys move focus across focusable children (e.g., RaCard)
const CardGrid: React.FC<React.PropsWithChildren> = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null)

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!ref.current) return
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (!keys.includes(e.key)) return
    const focusables = Array.from(ref.current.querySelectorAll<HTMLElement>('[tabindex], [role="button"]'))
      .filter(el => !el.hasAttribute('disabled'))
    if (focusables.length === 0) return
    const active = document.activeElement as HTMLElement | null
    const idx = Math.max(0, focusables.findIndex(el => el === active))

    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(focusables.length - 1, idx + 1)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, idx - 1)

    if (next !== idx) {
      e.preventDefault()
      focusables[next].focus()
    }
  }

  return (
    <div className="cards-grid" ref={ref} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}

export default CardGrid
