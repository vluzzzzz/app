import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { EASE } from '../../lib/motion'

const ITEM = 40 // alto de cada fila de la rueda
const VISIBLE = 5 // filas visibles
const PAD = (ITEM * (VISIBLE - 1)) / 2 // relleno para poder centrar extremos

const pad2 = (n: number) => String(n).padStart(2, '0')

// --- Tick satisfactorio: clic de perilla real (sample de Pixabay) ---
// El archivo /sounds/tick.mp3 trae varios clics seguidos; en cada tick se
// reproduce solo una tajada corta (~90ms) desde el primer clic detectado,
// con fade de salida para que corte limpio. Más vibración mínima.
const TICK_URL = '/sounds/tick.mp3'
const TICK_DUR = 0.09
let audioCtx: AudioContext | null = null
let tickBuf: AudioBuffer | null = null
let tickOffset = 0
let tickLoading = false
let lastTick = 0

/** Primer instante con sonido real (salta el silencio inicial del archivo). */
function findOnset(buf: AudioBuffer): number {
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    if (Math.abs(d[i]) > 0.08) return Math.max(0, i / buf.sampleRate - 0.005)
  }
  return 0
}

/** Precarga el sample (se llama al abrir la rueda, así el primer tick ya suena). */
function preloadTick() {
  if (tickBuf || tickLoading) return
  tickLoading = true
  try {
    audioCtx ??= new AudioContext()
    fetch(TICK_URL)
      .then((r) => r.arrayBuffer())
      .then((ab) => audioCtx!.decodeAudioData(ab))
      .then((buf) => {
        tickBuf = buf
        tickOffset = findOnset(buf)
      })
      .catch(() => {})
      .finally(() => {
        tickLoading = false
      })
  } catch {
    tickLoading = false
  }
}

function tick() {
  const now = performance.now()
  if (now - lastTick < 30) return // no ametrallar si giras rápido
  lastTick = now
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    if (!tickBuf) {
      preloadTick()
    } else {
      const t = ctx.currentTime
      const src = ctx.createBufferSource()
      src.buffer = tickBuf
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.32, t)
      gain.gain.setValueAtTime(0.32, t + TICK_DUR - 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t + TICK_DUR)
      src.connect(gain)
      gain.connect(ctx.destination)
      src.start(t, tickOffset, TICK_DUR)
    }
  } catch {
    /* sin audio no pasa nada */
  }
  try {
    navigator.vibrate?.(3)
  } catch {
    /* idem */
  }
}

/** Columna de rueda con scroll-snap (se detiene fila por fila). */
function WheelColumn({
  values,
  value,
  onChange,
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Al montar, posicionar la rueda en el valor inicial.
  useEffect(() => {
    const idx = Math.max(0, values.indexOf(value))
    ref.current?.scrollTo({ top: idx * ITEM })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / ITEM)
    const v = values[Math.max(0, Math.min(values.length - 1, idx))]
    if (v !== value) {
      tick() // clic + vibración al pasar cada fila
      onChange(v)
    }
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: ITEM * VISIBLE, width: 76 }}
    >
      <div style={{ height: PAD }} />
      {values.map((v) => (
        <div
          key={v}
          className={`flex snap-center items-center justify-center text-[18px] tabular-nums transition-colors duration-100 ${
            v === value ? 'font-bold text-ink' : 'font-medium text-ink/30'
          }`}
          style={{ height: ITEM }}
        >
          {pad2(v)}
        </div>
      ))}
      <div style={{ height: PAD }} />
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINS = Array.from({ length: 12 }, (_, i) => i * 5)

function PickerBody({
  title,
  value,
  onClose,
  onSave,
}: {
  title: string
  value: string
  onClose: () => void
  onSave: (hhmm: string) => void
}) {
  const [hh, mm] = value.split(':').map(Number)
  const [h, setH] = useState(Number.isFinite(hh) ? hh : 8)
  const [m, setM] = useState(Number.isFinite(mm) ? (Math.round(mm / 5) * 5) % 60 : 0)

  // Precargar el sample del tick apenas se abre la rueda.
  useEffect(() => {
    preloadTick()
  }, [])

  return (
    <motion.div
      className="glass-strong glass-highlight relative w-full max-w-md rounded-t-5xl px-5 pb-8 pt-3"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.45, ease: EASE.overshoot }}
    >
      {/* Grabber */}
      <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-ink/30" />
      <h2 className="mb-4 text-center text-lg font-semibold text-ink">{title}</h2>

      {/* Hora elegida, grande */}
      <div className="mx-auto mb-3 w-fit rounded-2xl bg-ink/[0.05] px-6 py-2.5 text-[26px] font-bold tabular-nums text-ink">
        {pad2(h)} : {pad2(m)}
      </div>

      {/* Ruedas (banda central resaltada) */}
      <div className="relative mx-auto flex w-fit items-center justify-center gap-1">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-ink/[0.05]" />
        <WheelColumn values={HOURS} value={h} onChange={setH} />
        <span className="relative z-10 text-[18px] font-bold text-ink/50">:</span>
        <WheelColumn values={MINS} value={m} onChange={setM} />
      </div>

      {/* Acciones */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={onClose}
          className="h-12 flex-1 rounded-2xl bg-ink/5 text-[15px] font-semibold text-ink active:bg-ink/10"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            onSave(`${pad2(h)}:${pad2(m)}`)
            onClose()
          }}
          className="h-12 flex-1 rounded-2xl bg-ink text-[15px] font-semibold text-surface active:opacity-90"
        >
          Listo
        </button>
      </div>
    </motion.div>
  )
}

type Props = {
  open: boolean
  title?: string
  /** "HH:mm" inicial. */
  value: string
  onClose: () => void
  onSave: (hhmm: string) => void
}

/**
 * Selector de hora tipo rueda iOS: horas (0-23) y minutos de 5 en 5,
 * con snap fila por fila, banda central y botones Cancelar / Listo.
 * Portal al body con z-[60] para quedar por sobre otras hojas (z-50).
 */
export function TimeWheelSheet({ open, title = 'Establecer hora', value, onClose, onSave }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          {/* key=value → cada apertura arranca en la hora actual del campo */}
          <PickerBody key={value} title={title} value={value} onClose={onClose} onSave={onSave} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
