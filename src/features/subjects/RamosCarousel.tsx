import { useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import type { Subject } from '../../lib/types'
import { SubjectHomeCard } from './SubjectHomeCard'

// Grises intercalados (oscuro / plomo) para las tarjetas.
const GRAYS = ['rgb(39 39 42)', 'rgb(82 82 91)']
const GAP = 16

/**
 * Carrusel de ramos de la Home: una tarjeta por vista, separadas, y cada desliz
 * mueve SOLO un ramo (aunque el gesto sea fuerte). Puntitos como indicador.
 */
export function RamosCarousel({
  subjects,
  onOpen,
}: {
  subjects: Subject[]
  onOpen: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const x = useMotionValue(0)

  // Mide el ancho del contenedor (para el paso del carrusel).
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const step = width + GAP

  // Reposiciona sin animar cuando cambia el ancho o el índice desde afuera.
  useLayoutEffect(() => {
    if (width) x.set(-index * step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(subjects.length - 1, i))
    setIndex(clamped)
    animate(x, -clamped * step, { type: 'spring', stiffness: 320, damping: 34 })
  }

  return (
    <div>
      <div ref={containerRef} className="overflow-hidden">
        <motion.div
          className="flex"
          style={{ x, gap: GAP }}
          drag="x"
          dragConstraints={{ left: -step * (subjects.length - 1), right: 0 }}
          dragElastic={0.08}
          onDragEnd={(_, info) => {
            // Un solo paso por desliz: decide por la dirección, NO por la fuerza.
            const threshold = width * 0.2
            if (info.offset.x < -threshold) goTo(index + 1)
            else if (info.offset.x > threshold) goTo(index - 1)
            else goTo(index)
          }}
        >
          {subjects.map((s, i) => (
            <div key={s.id} style={{ minWidth: width || '100%' }} className="shrink-0">
              <SubjectHomeCard subject={s} bg={GRAYS[i % GRAYS.length]} onOpen={() => onOpen(s.id)} />
            </div>
          ))}
        </motion.div>
      </div>

      {subjects.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {subjects.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al ramo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-ink/70' : 'w-1.5 bg-ink/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
