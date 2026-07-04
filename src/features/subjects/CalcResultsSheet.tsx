import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Subject } from '../../lib/types'
import {
  combinationsFor,
  currentGrade,
  minGradeToPass,
  pendingEvaluations,
  projectedFinal,
  realEvaluationCount,
} from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import { EASE } from '../../lib/motion'
import { GlassSheet } from '../../components/ui/GlassSheet'
import { GradeInput } from '../../components/ui/GradeInput'
import { StatusPill } from '../../components/ui/StatusPill'

type Tab = 'parejo' | 'combos' | 'interactivo'

export function CalcResultsSheet({
  subject,
  open,
  onClose,
}: {
  subject: Subject
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('parejo')

  const current = currentGrade(subject)
  const res = minGradeToPass(subject)
  const pend = useMemo(() => pendingEvaluations(subject), [subject])
  const combos = useMemo(() => combinationsFor(subject), [subject])
  const { scale } = subject

  // Estado del modo interactivo: nota asignada a cada pendiente.
  const [guesses, setGuesses] = useState<Record<string, number | null>>({})
  useEffect(() => {
    if (!open) return
    const init: Record<string, number | null> = {}
    const def = res.status === 'ALCANZABLE' ? res.needed : null
    pend.forEach((p) => (init[p.id] = def))
    setGuesses(init)
    setTab('parejo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const numericGuesses = Object.fromEntries(
    Object.entries(guesses).filter(([, v]) => v != null) as [string, number][],
  )
  const projected = projectedFinal(subject, numericGuesses)
  const passes = projected + 1e-9 >= scale.pass

  const hasData = realEvaluationCount(subject) > 0
  const nothingPending = hasData && pend.length === 0

  return (
    <GlassSheet open={open} onClose={onClose} title="Calcular">
      {/* Cabecera con nota actual + estado */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/45">
            Nota actual
          </p>
          <p className="text-3xl font-bold tabular-nums text-ink">
            {formatGrade(current)}
          </p>
        </div>
        <StatusPill status={res.status} />
      </div>

      {!hasData && (
        <Empty text="Agrega evaluaciones para poder calcular." />
      )}

      {nothingPending && (
        <ResultCard>
          <p className="text-sm text-ink/60">
            {res.final != null && res.final >= scale.pass
              ? 'Ya no queda nada pendiente. Tu nota final es'
              : 'Semestre cerrado. Tu nota final es'}
          </p>
          <BigNumber
            value={formatGrade(res.final ?? current)}
            tone={
              (res.final ?? 0) >= scale.pass ? 'good' : 'bad'
            }
          />
        </ResultCard>
      )}

      {hasData && pend.length > 0 && (
        <>
          {/* Tabs */}
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-ink/5 p-1">
            {(
              [
                ['parejo', 'Parejo'],
                ['combos', 'Combinaciones'],
                ['interactivo', 'Interactivo'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors ${
                  tab === id ? 'text-surface' : 'text-ink/60'
                }`}
              >
                {tab === id && (
                  <motion.span
                    layoutId="calc-tab"
                    className="absolute inset-0 -z-10 rounded-xl bg-ink"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {label}
              </button>
            ))}
          </div>

          {/* Contenido según estado global */}
          {res.status === 'ASEGURADO' ? (
            <ResultCard>
              <p className="text-sm text-ink/60">Da lo mismo lo que saques</p>
              <BigNumber value="¡Ya pasaste!" tone="good" small />
            </ResultCard>
          ) : res.status === 'IMPOSIBLE' ? (
            <ResultCard>
              <p className="text-sm text-ink/60">
                Ni con la nota máxima en lo que falta alcanzas a aprobar.
              </p>
              <BigNumber value="No alcanza 😔" tone="bad" small />
            </ResultCard>
          ) : (
            <>
              {tab === 'parejo' && (
                <ResultCard>
                  <p className="text-sm text-ink/60">
                    Necesitas en cada nota que falta (parejo)
                  </p>
                  <BigNumber value={formatGrade(res.needed)} tone="neutral" />
                  <div className="mt-3 space-y-1.5">
                    {pend.map((p) => (
                      <Row
                        key={p.id}
                        label={label(p)}
                        value={formatGrade(res.needed)}
                      />
                    ))}
                  </div>
                </ResultCard>
              )}

              {tab === 'combos' &&
                (pend.length === 1 ? (
                  <ResultCard>
                    <p className="text-sm text-ink/60">
                      Solo te falta una nota. Necesitas
                    </p>
                    <BigNumber value={formatGrade(res.needed)} tone="neutral" />
                  </ResultCard>
                ) : combos ? (
                  <ResultCard>
                    <p className="mb-3 text-sm text-ink/60">
                      Combinaciones para aprobar (nota {formatGrade(scale.pass)})
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 border-b border-ink/10 pb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                      <span>{label(combos.first)}</span>
                      <span className="text-right">{label(combos.second)}</span>
                    </div>
                    <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto">
                      {combos.rows.map((r, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-2 gap-x-3 rounded-lg px-1 py-1.5 text-[15px] odd:bg-ink/[0.04]"
                        >
                          <span className="font-semibold tabular-nums text-ink">
                            {formatGrade(r.a)}
                          </span>
                          <span className="text-right tabular-nums">
                            {r.b == null ? (
                              <span className="text-rose-500">no alcanza</span>
                            ) : r.b <= scale.min + 0.001 ? (
                              <span className="text-emerald-600 dark:text-emerald-300">
                                libre
                              </span>
                            ) : (
                              <span className="font-semibold text-ink">
                                {formatGrade(r.b)}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ResultCard>
                ) : (
                  <ResultCard>
                    <p className="text-sm text-ink/60">
                      Tienes más de 2 notas pendientes. Usa <b>Parejo</b> para el
                      mínimo o <b>Interactivo</b> para probar combinaciones.
                    </p>
                  </ResultCard>
                ))}

              {tab === 'interactivo' && (
                <ResultCard>
                  <p className="mb-3 text-sm text-ink/60">
                    Pon lo que crees que sacarás y mira si pasas.
                  </p>
                  <div className="space-y-2">
                    {pend.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-ink/5 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                          {label(p)}
                        </span>
                        <GradeInput
                          value={guesses[p.id] ?? null}
                          scale={scale}
                          onChange={(v) =>
                            setGuesses((g) => ({ ...g, [p.id]: v }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-3xl bg-ink/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-ink/45">
                      Nota final proyectada
                    </p>
                    <BigNumber
                      value={formatGrade(projected)}
                      tone={passes ? 'good' : 'bad'}
                    />
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        passes
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-rose-500 dark:text-rose-300'
                      }`}
                    >
                      {passes ? '✅ Apruebas' : '❌ No apruebas'}
                    </p>
                  </div>
                </ResultCard>
              )}
            </>
          )}
        </>
      )}
    </GlassSheet>
  )
}

function label(p: { name: string; subName: string | null }) {
  return p.subName ? `${p.subName} · ${p.name}` : p.name
}

function ResultCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.35, ease: EASE.smooth }}
      className="rounded-3xl bg-ink/[0.06] p-5 text-center"
    >
      {children}
    </motion.div>
  )
}

function BigNumber({
  value,
  tone,
  small,
}: {
  value: string
  tone: 'good' | 'bad' | 'neutral'
  small?: boolean
}) {
  const color =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'bad'
        ? 'text-rose-500 dark:text-rose-300'
        : 'text-ink'
  return (
    <motion.div
      key={value}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE.overshootBig }}
      className={`font-black tabular-nums ${small ? 'text-3xl' : 'text-6xl'} ${color}`}
    >
      {value}
    </motion.div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink/[0.04] px-3 py-2 text-[15px]">
      <span className="min-w-0 truncate text-ink/80">{label}</span>
      <span className="font-bold tabular-nums text-ink">{value}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-ink/[0.06] p-6 text-center text-sm text-ink/55">
      {text}
    </div>
  )
}
