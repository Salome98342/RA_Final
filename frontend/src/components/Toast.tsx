import React from 'react'

type Props = { text: string; type?: 'ok' | 'error' }
const Toast: React.FC<Props> = ({ text, type = 'ok' }) => (
  <div role="status" aria-live="polite" className={`mensaje visible ${type}`}>{text}</div>
)

export default Toast
