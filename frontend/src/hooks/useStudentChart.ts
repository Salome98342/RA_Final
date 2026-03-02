import { useRef, useState, useCallback } from 'react'
import { Chart } from 'chart.js/auto'
import type { Student } from '@/types'
import { getIndicatorChart } from '@/services/api'

/**
 * Hook personalizado para manejar gráficos de indicadores de estudiante
 * Evita duplicación de código entre Docente.tsx y Calificar.tsx
 */
export const useStudentChart = (curso: string | null | undefined, raId?: string) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [chartEmpty, setChartEmpty] = useState(false)

  const renderChart = useCallback(async (student: Student) => {
    if (!curso) return
    
    const data = await getIndicatorChart(curso, student.id)
    const filtered = raId ? data.filter(d => String(d.ra_id) === String(raId)) : data
    const noData = filtered.length === 0 || filtered.every(d => d.avg_pct == null)
    
    setChartEmpty(noData)
    const canvas = chartRef.current
    if (!canvas) return

    // Destruir gráfico anterior si existe
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    if (noData) return  // No renderizar si no hay datos

    // Preparar datos usando los nombres correctos de las propiedades
    const labels = filtered.map((d) => {
      const raLabel = `RA ${d.ra_id}`  // No tenemos ra_titulo en la respuesta
      const desc = d.descripcion ? d.descripcion.substring(0, 35) : `Ind ${d.id_ind}`
      return `${raLabel} - ${desc}`
    })
    const values = filtered.map(d => (d.avg_pct != null ? Math.round(d.avg_pct) : 0))

    // Crear gráfico
    chartInstance.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avance (%)',
          data: values,
          backgroundColor: values.map(v => {
            if (v >= 70) return 'rgba(40, 167, 69, 0.7)'
            if (v >= 40) return 'rgba(255, 193, 7, 0.7)'
            return 'rgba(220, 53, 69, 0.7)'
          }),
          borderColor: values.map(v => {
            if (v >= 70) return 'rgba(40, 167, 69, 1)'
            if (v >= 40) return 'rgba(255, 193, 7, 1)'
            return 'rgba(220, 53, 69, 1)'
          }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}% completado`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (v) => `${v}%`
            },
            title: {
              display: true,
              text: 'Porcentaje de Avance'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: { size: 10 }
            }
          }
        }
      }
    })
  }, [curso, raId])

  const destroyChart = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }
  }, [])

  return {
    chartRef,
    chartEmpty,
    renderChart,
    destroyChart
  }
}
