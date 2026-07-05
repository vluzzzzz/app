import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

/**
 * Anima un número desde su valor anterior al nuevo pasando por los enteros
 * intermedios (tipo odómetro), lento y suave. Sin fade ni corte.
 */
export function AnimatedNumber({
  value,
  duration = 0.9,
  className = '',
}: {
  value: number
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const controls = animate(display, value, {
      duration,
      ease: [0.11, 1, 0, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span className={className}>{display}</span>
}
