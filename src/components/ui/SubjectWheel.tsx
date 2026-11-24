import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from './Icons'
import { RAISED } from './relief'

export type WheelItem = { id: string; name: string; rgb: string }

const ITEM = 56 // alto de cada fila
const VISIBLE = 7 // filas visibles (impar: hay una central)
const PAD = (ITEM * (VISIBLE - 1)) / 2 // relleno para centrar los extremos

/**
 * Rueda vertical tipo selector de iOS para elegir un ramo. El ramo del centro
 * queda grande, en una píldora de SU color con relieve; los de arriba y abajo
 * se achican, se aclaran y se curvan como un cilindro. Se mueve con la ruedita
 * del mouse, arrastrando, con el trackpad, con las flechas o tocando un ramo.
 * Reutiliza el patrón scroll-snap de TimeWheelSheet.
 */
export function SubjectWheel({
  items,
  value,
  onChange,
}: {
  items: WheelItem[]
  value: string
  onChange: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const raf = useRef(0)

  const idxOf = (id: string) => Math.max(0, items.findIndex((it) => it.id === id))

  // Posicionar en el valor inicial (y re-centrar si cambia desde afuera).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const top = idxOf(value) * ITEM
    el.scrollTo({ top })
    setScrollTop(top)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items.length])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      setScrollTop(el.scrollTop)
      const idx = Math.round(el.scrollTop / ITEM)
      const it = items[Math.max(0, Math.min(items.length - 1, idx))]
      if (it && it.id !== value) {
        try {
          navigator.vibrate?.(3)
        } catch {
          /* sin vibración no pasa nada */
        }
        onChange(it.id)
      }
    })
  }

  const scrollToIdx = (i: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, i))
    ref.current?.scrollTo({ top: clamped * ITEM, behavior: 'smooth' })
  }

  const viewCenter = scrollTop + (ITEM * VISIBLE) / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => scrollToIdx(idxOf(value) - 1)}
        aria-label="Ramo anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--card))] text-ink/45 shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-ink/[0.06] transition-colors hover:text-ink"
      >
        <ChevronDown className="h-4 w-4 rotate-180" />
      </button>

      <div
        ref={ref}
        onScroll={onScroll}
        tabIndex={0}
        role="listbox"
        aria-label="Elegir ramo"
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            scrollToIdx(idxOf(value) - 1)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            scrollToIdx(idxOf(value) + 1)
          }
        }}
        className="snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: ITEM * VISIBLE, width: 232, perspective: 900, maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <div style={{ height: PAD }} />
        {items.map((it, i) => {
          const itemCenter = PAD + i * ITEM + ITEM / 2
          const d = (itemCenter - viewCenter) / ITEM // distancia en filas al centro
          const ad = Math.min(Math.abs(d), 3.5)
          const active = Math.abs(d) < 0.5
          return (
            <div
              key={it.id}
              className="flex snap-center items-center justify-center"
              style={{ height: ITEM, transform: `rotateX(${-d * 20}deg)`, transformOrigin: 'center' }}
            >
              <button
                type="button"
                onClick={() => scrollToIdx(i)}
                className="flex max-w-full items-center justify-center rounded-full px-5 py-2.5 text-center font-bold leading-tight transition-colors"
                style={{
                  opacity: Math.max(0.2, 1 - ad * 0.3),
                  transform: `scale(${Math.max(0.74, 1 - ad * 0.1)})`,
                  ...(active
                    ? { ...RAISED, backgroundColor: `rgb(${it.rgb})`, color: '#fff', fontSize: 19 }
                    : { color: 'rgb(var(--ink))', fontSize: 17 }),
                }}
              >
                <span className="line-clamp-2">{it.name}</span>
              </button>
            </div>
          )
        })}
        <div style={{ height: PAD }} />
      </div>

      <motion.button
        type="button"
        onClick={() => scrollToIdx(idxOf(value) + 1)}
        aria-label="Ramo siguiente"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--card))] text-ink/45 shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-ink/[0.06] transition-colors hover:text-ink"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.button>
    </div>
  )
}

/** Degradado arriba y abajo para que los extremos se desvanezcan (look cilindro). */
const FADE =
  'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)'
