import { useEffect, useState } from 'react'

/**
 * Medidor de FPS (solo diagnóstico). Se muestra si la URL tiene ?fps
 * (ej: www.brrody.app/?fps). Verde ≥55 = fluido, amarillo 40-54 = regular,
 * rojo <40 = lag. Cuenta frames reales con requestAnimationFrame.
 */
export function FpsMeter() {
  const [fps, setFps] = useState(0)
  const [min, setMin] = useState(999)

  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (t: number) => {
      frames++
      if (t - last >= 1000) {
        const value = Math.round((frames * 1000) / (t - last))
        setFps(value)
        setMin((m) => Math.min(m, value))
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const color = fps >= 55 ? '#22c55e' : fps >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(8px, env(safe-area-inset-top))',
        left: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.75)',
        color,
        font: 'bold 12px monospace',
        padding: '5px 9px',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    >
      {fps} FPS · min {min === 999 ? '—' : min}
    </div>
  )
}
