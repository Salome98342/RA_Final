import React from 'react'

const Test: React.FC = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f0f0f0'
    }}>
      <div style={{
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>✅ React está funcionando</h1>
        <p style={{ color: '#666' }}>El servidor frontend está corriendo correctamente</p>
        <p style={{ fontSize: '0.875rem', color: '#999' }}>
          Frontend: http://localhost:5173/<br />
          Backend: http://localhost:8000/
        </p>
      </div>
    </div>
  )
}

export default Test
