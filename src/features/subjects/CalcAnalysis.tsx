import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { GradeNode, Subject } from '../../lib/types'
import {
  analyzeSituation,
  combinationsFor,
  conditionResults,
  conditionsAllFeasible,
  currentGrade,
  impactTable,
  conditionsAllMet,
  maxPossibleFinal,
  meetsAll,
  minGradeToPass,
  minPossibleFinal,
  optativaBase,
  optativaFinal,
  optativaMax,
  optativaNeeded,
  optativaProjection,
  pendingEvaluations,
  pendingWeight,
  realEvaluationCount,
  scenariosFor,
  type ConditionResult,
  type PendingEval,
  type Situation,
} from '../../lib/grades'
import { formatGrade } from '../../lib/format'
import {
  AlertIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ChevronRight,
  FolderIcon,
  PercentIcon,
  ScaleIcon,
  TargetIcon,
  TrendingUpIcon,
  XCircleIcon,
} from '../../components/ui/Icons'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'ink'
const TONE: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: 'bg-emerald-500/12', fg: 'text-emerald-600 dark:text-emerald-300' },
  amber: { bg: 'bg-amber-500/12', fg: 'text-amber-600 dark:text-amber-300' },
  red: { bg: 'bg-rose-500/12', fg: 'text-rose-600 dark:text-rose-300' },
  blue: { bg: 'bg-blue-500/12', fg: 'text-blue-600 dark:text-blue-300' },
  ink: { bg: 'bg-ink/8', fg: 'text-ink' },
}

const nameOf = (p: { name: string; subName: string | null }) =>
  p.subName ? `${p.subName} · ${p.name}` : p.name
const pctOf = (p: PendingEval) => Math.round(p.weight * 1000) / 10

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>
}

function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[17px] font-bold text-ink">{children}</h3>
      {sub && <p className="text-sm text-ink/45">{sub}</p>}
    </div>
  )
}

/** Fila con icono en círculo de color + título + subtítulo + valor. */
function InsightRow({
  icon,
  tone,
  title,
  sub,
  value,
}: {
  icon: ReactNode
  tone: Tone
  title: string
  sub?: string
  value?: string
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE[tone].bg} ${TONE[tone].fg}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {sub && <p className="text-[13px] leading-snug text-ink/45">{sub}</p>}
      </div>
      {value && <span className={`shrink-0 text-lg font-bold tabular-nums ${TONE[tone].fg}`}>{value}</span>}
    </div>
  )
}

export function CalcAnalysis({ subject }: { subject: Subject }) {
  const { scale } = subject
  const [tab, setTab] = useState(0)
  const [showAll, setShowAll] = useState(false)

  if (realEvaluationCount(subject) === 0) {
    return (
      <Card className="text-center text-sm text-ink/55">
        Agrega evaluaciones para poder calcular.
      </Card>
    )
  }

  const current = currentGrade(subject)
  const res = minGradeToPass(subject)
  const pend = pendingEvaluations(subject)
  const pendPct = Math.round(pendingWeight(subject) * 100)
  const maxFinal = maxPossibleFinal(subject)
  const minFinal = minPossibleFinal(subject)
  const situation = analyzeSituation(subject)
  const conds = conditionResults(subject)
  const canPass = maxFinal + 1e-9 >= scale.pass && conditionsAllFeasible(subject)

  // Posición en el medidor de escala (0..1).
  const span = scale.max - scale.min || 1
  const pos = current == null ? 0 : Math.max(0, Math.min(1, (current - scale.min) / span))
  const passPos = Math.max(0, Math.min(1, (scale.pass - scale.min) / span))

  const sit = situationCard(situation, subject, res, maxFinal)

  return (
    <div className="space-y-4">
      {/* Medidor de escala */}
      <Card>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-sm text-ink/50">Promedio actual</p>
            <span className="text-3xl font-black tabular-nums text-ink">
              {current == null ? formatGrade(scale.min) : formatGrade(current)}
            </span>
          </div>
          <p className="text-sm text-ink/45">
            Aprobar: <b className="text-ink/70">{formatGrade(scale.pass)}</b>
          </p>
        </div>
        <div className="relative mt-3 h-2.5 w-full rounded-full bg-ink/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-ink"
            style={{ width: `${pos * 100}%` }}
          />
          {/* Marca de aprobación */}
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-ink/40"
            style={{ left: `${passPos * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink/40">
          <span>{formatGrade(scale.min)}</span>
          <span>{formatGrade(scale.max)}</span>
        </div>
      </Card>

      {/* Situación */}
      <Card>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${TONE[sit.tone].bg} ${TONE[sit.tone].fg}`}>
            {sit.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-ink">{sit.title}</p>
            <p className="text-[13px] leading-snug text-ink/50">{sit.sub}</p>
          </div>
        </div>
      </Card>

      {/* Condiciones de aprobación (si el ramo tiene) */}
      {conds.length > 0 && <ConditionsCard conds={conds} pass={scale.pass} />}

      {/* Prueba optativa (si el ramo tiene) */}
      {subject.optativa && <OptativaCard subject={subject} />}

      {/* Caso cerrado (sin pendientes): nota final */}
      {pend.length === 0 ? (
        <Card>
          <Title>Nota final</Title>
          <span
            className={`text-4xl font-black tabular-nums ${
              (res.final ?? current ?? 0) >= scale.pass ? TONE.green.fg : TONE.red.fg
            }`}
          >
            {formatGrade(res.final ?? current)}
          </span>
        </Card>
      ) : (
        <>
          {/* Análisis general */}
          <Card>
            <Title>Análisis general</Title>
            <InsightRow
              icon={canPass ? <CheckCircleIcon className="h-5 w-5" /> : <AlertIcon className="h-5 w-5" />}
              tone={canPass ? 'green' : 'amber'}
              title={canPass ? 'Sí puedes aprobar' : 'Necesitas Remedial'}
              sub={
                canPass
                  ? `Aún tienes forma de llegar a ${formatGrade(scale.pass)}.`
                  : 'Con lo que queda no alcanzas: para aprobar te quedaría Remedial u Optativa.'
              }
            />
            <InsightRow
              icon={<TrendingUpIcon className="h-5 w-5" />}
              tone="green"
              title="Promedio máximo"
              sub={`Si sacas ${formatGrade(scale.max)} en todo lo que queda.`}
              value={formatGrade(maxFinal)}
            />
            <InsightRow
              icon={<PercentIcon className="h-5 w-5" />}
              tone="amber"
              title="Peso restante"
              sub="Del ramo aún por evaluar."
              value={`${pendPct}%`}
            />
            <InsightRow
              icon={<AlertIcon className="h-5 w-5" />}
              tone="ink"
              title="Si te va mal"
              sub={`Sacando ${formatGrade(scale.min)} en lo que queda.`}
              value={formatGrade(minFinal)}
            />
          </Card>

          {/* Te quedan N evaluaciones (agrupadas por sección: carpeta + círculos) */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-ink">
                Te quedan {pend.length} {pend.length === 1 ? 'evaluación' : 'evaluaciones'}
              </h3>
              <span className="text-sm font-semibold text-ink/45">{pendPct}% del ramo</span>
            </div>
            <div className="space-y-2">
              {groupBySection(pend).map((g, gi) => (
                <div key={gi}>
                  {g.section && (
                    <div className="flex items-center gap-2 pb-0.5 pt-1">
                      <FolderIcon className="h-4 w-4 shrink-0 text-ink" />
                      <span className="text-sm font-semibold text-ink">{g.section}</span>
                    </div>
                  )}
                  {g.items.map((p) => (
                    <div key={p.id} className={`flex items-center gap-2.5 py-1 ${g.section ? 'pl-1.5' : ''}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ink/45" />
                      <span className="min-w-0 flex-1 truncate text-[15px] text-ink/90">{p.name}</span>
                      <span className="text-sm font-semibold tabular-nums text-ink/55">{pctOf(p)}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Posibilidades para aprobar (2 pendientes) */}
          {pend.length === 2 && <Posibilidades subject={subject} showAll={showAll} onToggle={() => setShowAll((v) => !v)} />}

          {/* Escenarios destacados (2 pendientes) */}
          {pend.length === 2 && <Escenarios subject={subject} />}

          {/* Posibilidades cuando faltan 3 o más (combinación sugerida) */}
          {pend.length >= 3 && res.status === 'ALCANZABLE' && res.needed != null && (
            <Card>
              <Title sub="Una combinación simple que te hace aprobar">Posibilidades para aprobar</Title>
              <p className="mb-2 text-sm text-ink/60">
                Si en cada evaluación que te queda sacas al menos{' '}
                <b className="text-ink">{formatGrade(res.needed)}</b>, apruebas.
              </p>
              <div className="space-y-1">
                {pend.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-ink/[0.04] px-3 py-2 text-[15px]"
                  >
                    <span className="min-w-0 truncate text-ink/90">{nameOf(p)}</span>
                    <span className="font-bold tabular-nums text-ink">{formatGrade(res.needed)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Impacto: solo cuando queda UNA nota (para saber exactamente) */}
          {pend.length === 1 && <Impacto subject={subject} pend={pend} tab={tab} setTab={setTab} />}

          {/* Evaluaciones actuales (árbol: secciones/subgrupos como carpetas) */}
          <Card>
            <Title>Tus evaluaciones actuales</Title>
            <EvalTree nodes={subject.nodes} depth={0} />
          </Card>
        </>
      )}
    </div>
  )
}

/* ---------- Sub-bloques ---------- */

function Posibilidades({
  subject,
  showAll,
  onToggle,
}: {
  subject: Subject
  showAll: boolean
  onToggle: () => void
}) {
  const combos = combinationsFor(subject)
  if (!combos) return null
  const hasConds = (subject.conditions ?? []).length > 0
  const feasible = combos.rows.filter(
    (r) =>
      r.b != null &&
      (!hasConds || meetsAll(subject, { [combos.first.id]: r.a, [combos.second.id]: r.b as number })),
  )
  const { scale } = subject
  if (feasible.length === 0) {
    if (!hasConds) return null
    return (
      <Card>
        <Title>Posibilidades para aprobar</Title>
        <p className="text-sm text-ink/55">
          Con estas dos notas no se cumplen las condiciones de aprobación. Revisa qué necesita
          cada sección arriba.
        </p>
      </Card>
    )
  }
  const shown = showAll ? feasible : pickEven(feasible, 6)
  return (
    <Card>
      <Title sub={`Algunas combinaciones para llegar a ${formatGrade(scale.pass)}`}>
        Posibilidades para aprobar
      </Title>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 border-b border-ink/10 pb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
        <span className="truncate">{combos.first.name}</span>
        <span className="truncate">{combos.second.name}</span>
        <span>Final</span>
        <span className="w-5" />
      </div>
      <div className="mt-1">
        {shown.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-x-2 py-1.5 text-[15px]">
            <span className="font-semibold tabular-nums text-ink">{formatGrade(r.a)}</span>
            <span className="font-semibold tabular-nums text-ink">{formatGrade(r.b)}</span>
            <span className="tabular-nums text-ink/70">{formatGrade(scale.pass)}</span>
            <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
          </div>
        ))}
      </div>
      {feasible.length > 6 && (
        <button
          onClick={onToggle}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-ink/5 py-2 text-sm font-semibold text-ink/60 active:bg-ink/10"
        >
          {showAll ? 'Ver menos' : 'Ver más combinaciones'}
          <ChevronRight className={`h-4 w-4 transition-transform ${showAll ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      )}
    </Card>
  )
}

function Escenarios({ subject }: { subject: Subject }) {
  const sc = scenariosFor(subject)
  if (!sc) return null
  const items = [
    { key: 'balanced', icon: <ScaleIcon className="h-5 w-5" />, title: 'Ir parejo', s: sc.balanced },
    { key: 'higherFirst', icon: <TrendingUpIcon className="h-5 w-5" />, title: `Mejor en ${sc.first.name}`, s: sc.higherFirst },
    { key: 'higherSecond', icon: <TargetIcon className="h-5 w-5" />, title: `Mejor en ${sc.second.name}`, s: sc.higherSecond },
  ].filter((x) => x.s)
  if (items.length === 0) return null
  return (
    <Card>
      <Title>Escenarios destacados</Title>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-3 rounded-2xl bg-ink/[0.04] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink/70">
              {it.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">{it.title}</p>
              <p className="truncate text-[13px] text-ink/45">
                {sc.first.name}: {formatGrade(it.s!.a)} · {sc.second.name}: {formatGrade(it.s!.b)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-300">
                {formatGrade(it.s!.final)}
              </p>
              <p className="text-[11px] text-ink/40">Final</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Impacto({
  subject,
  pend,
  tab,
  setTab,
}: {
  subject: Subject
  pend: PendingEval[]
  tab: number
  setTab: (n: number) => void
}) {
  const active = pend[Math.min(tab, pend.length - 1)]
  if (!active) return null
  const rows = impactTable(subject, active.id)
  const { scale } = subject
  const firstPass = rows.find((r) => r.final + 1e-9 >= scale.pass)

  return (
    <Card>
      <Title sub="Según la nota que saques en cada evaluación">Impacto en tu promedio</Title>
      {pend.length > 1 && (
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl bg-ink/5 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pend.map((p, i) => {
            const on = i === Math.min(tab, pend.length - 1)
            return (
              <button
                key={p.id}
                onClick={() => setTab(i)}
                className={`relative shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition-colors ${on ? 'text-surface' : 'text-ink/60'}`}
              >
                {on && (
                  <motion.span layoutId="impacto-tab" className="absolute inset-0 -z-10 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                {p.name}
              </button>
            )
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-2 border-b border-ink/10 pb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
        <span>Si sacas</span>
        <span className="text-right">Tu promedio sería</span>
      </div>
      <div className="mt-1">
        {rows.map((r, i) => {
          const ok = r.final + 1e-9 >= scale.pass
          return (
            <div key={i} className="grid grid-cols-2 gap-x-2 py-1.5 text-[15px]">
              <span className="font-semibold tabular-nums text-ink">{formatGrade(r.x)}</span>
              <span className={`text-right font-semibold tabular-nums ${ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-ink/70'}`}>
                {formatGrade(r.final)}
              </span>
            </div>
          )
        })}
      </div>
      {firstPass && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/12 px-3 py-2.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-200">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          Con un {formatGrade(firstPass.x)} en {active.name} ya quedas sobre {formatGrade(scale.pass)}.
        </div>
      )}
    </Card>
  )
}

/* ---------- helpers ---------- */

function ConditionsCard({ conds, pass }: { conds: ConditionResult[]; pass: number }) {
  return (
    <Card>
      <Title sub="Reglas extra para aprobar este ramo">Condiciones de aprobación</Title>
      <div className="space-y-1">
        {/* Condición base siempre presente */}
        <div className="flex items-center gap-2.5 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink/60">
            <CheckCircleIcon className="h-5 w-5" />
          </span>
          <p className="flex-1 text-[15px] font-semibold text-ink">
            Promedio final ≥ {formatGrade(pass)}
          </p>
        </div>
        {conds.map((c) => {
          const tone: Tone = c.met ? 'green' : c.feasible ? 'amber' : 'red'
          const icon = c.met ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : c.feasible ? (
            <AlertIcon className="h-5 w-5" />
          ) : (
            <XCircleIcon className="h-5 w-5" />
          )
          const sub =
            c.current == null
              ? 'Aún sin nota en esta sección.'
              : c.met
                ? `Vas en ${formatGrade(c.current)}, cumple.`
                : c.feasible
                  ? c.needed != null
                    ? `Vas en ${formatGrade(c.current)}; necesitas ${formatGrade(c.needed)} en lo que falta de ${c.name}.`
                    : `Vas en ${formatGrade(c.current)}, aún por debajo.`
                  : `Ya no alcanza: el máximo de ${c.name} no llega a ${formatGrade(c.min)}.`
          return (
            <div key={c.id} className="flex items-center gap-2.5 py-1.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[tone].bg} ${TONE[tone].fg}`}>
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">
                  {c.name} ≥ {formatGrade(c.min)}
                </p>
                <p className="text-[13px] leading-snug text-ink/45">{sub}</p>
              </div>
              <span className={`shrink-0 text-lg font-bold tabular-nums ${TONE[tone].fg}`}>
                {c.current == null ? '—' : formatGrade(c.current)}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function OptativaCard({ subject }: { subject: Subject }) {
  const o = subject.optativa!
  const { scale } = subject
  const base = optativaBase(subject)

  if (base == null) {
    return (
      <Card>
        <Title>Prueba optativa</Title>
        <p className="text-sm text-ink/55">Ingresa tus notas normales para calcular la optativa.</p>
      </Card>
    )
  }

  // Ya rendida → resultado.
  if (o.grade != null) {
    const final = optativaFinal(subject) ?? 0
    const ok = final + 1e-9 >= scale.pass && conditionsAllMet(subject)
    return (
      <Card>
        <Title>Resultado con optativa</Title>
        <div className="flex items-center justify-between py-1 text-[15px]">
          <span className="text-ink/60">Promedio anterior</span>
          <span className="font-semibold tabular-nums text-ink">{formatGrade(base)}</span>
        </div>
        <div className="flex items-center justify-between py-1 text-[15px]">
          <span className="text-ink/60">Optativa ({100 - o.actualPct}%)</span>
          <span className="font-semibold tabular-nums text-ink">{formatGrade(o.grade)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
          <span className="text-[15px] font-semibold text-ink">Promedio resultante</span>
          <span className={`text-2xl font-black tabular-nums ${ok ? TONE.green.fg : TONE.red.fg}`}>
            {formatGrade(final)}
          </span>
        </div>
        <p className={`mt-1 text-right text-sm font-semibold ${ok ? TONE.green.fg : TONE.red.fg}`}>
          {ok ? 'Aprobado' : 'No aprobado'}
        </p>
        {!conditionsAllMet(subject) && final + 1e-9 >= scale.pass && (
          <p className="mt-1 text-[13px] text-ink/50">Aún debes cumplir las condiciones de aprobación de arriba.</p>
        )}
      </Card>
    )
  }

  // Pendiente → cuánto necesita + tabla.
  const needed = optativaNeeded(subject)
  const max = optativaMax(subject) ?? 0
  const step = scale.max - scale.min <= 10 ? 1 : 5
  const rows: { x: number; final: number }[] = []
  for (let x = scale.min; x <= scale.max + 1e-9; x += step) {
    rows.push({ x: Math.round(x * 10) / 10, final: Math.round((optativaProjection(subject, x) ?? 0) * 10) / 10 })
  }

  return (
    <Card>
      <Title sub={`Tu promedio actual (${o.actualPct}%) + optativa (${100 - o.actualPct}%)`}>
        Prueba optativa
      </Title>
      {needed == null ? (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
          Ni con {formatGrade(scale.max)} en la optativa alcanzas: tu máximo sería {formatGrade(max)}.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-blue-500/10 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300">
              <TargetIcon className="h-5 w-5" />
            </span>
            <p className="text-[15px] text-ink">
              Necesitas <b>{formatGrade(needed)}</b> en la optativa para aprobar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-2 border-b border-ink/10 pb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span>Si sacas</span>
            <span className="text-right">Promedio final</span>
          </div>
          <div className="mt-1">
            {rows.map((r, i) => {
              const ok = r.final + 1e-9 >= scale.pass
              return (
                <div key={i} className="grid grid-cols-2 gap-x-2 py-1.5 text-[15px]">
                  <span className="font-semibold tabular-nums text-ink">{formatGrade(r.x)}</span>
                  <span className={`text-right font-semibold tabular-nums ${ok ? TONE.green.fg : 'text-ink/70'}`}>
                    {formatGrade(r.final)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}

/** Árbol de solo lectura: secciones/subgrupos como carpetas, notas con su nota. */
function EvalTree({ nodes, depth }: { nodes: GradeNode[]; depth: number }) {
  return (
    <div className={depth > 0 ? 'ml-1.5 border-l border-ink/10 pl-3' : ''}>
      {nodes.map((n) =>
        n.children === undefined ? (
          <div key={n.id} className="flex items-center gap-2.5 py-1">
            <span className={`h-2 w-2 shrink-0 rounded-full ${n.grade == null ? 'bg-ink/25' : 'bg-emerald-500'}`} />
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink/90">{n.name}</span>
            <span className="text-[15px] font-bold tabular-nums text-ink">
              {n.grade == null ? '—' : formatGrade(n.grade)}
            </span>
          </div>
        ) : (
          <div key={n.id}>
            <div className="flex items-center gap-2 pb-0.5 pt-1.5">
              <FolderIcon className="h-4 w-4 shrink-0 text-ink/70" />
              <span className="text-[15px] font-semibold text-ink">{n.name}</span>
            </div>
            <EvalTree nodes={n.children} depth={depth + 1} />
          </div>
        ),
      )}
    </div>
  )
}

/** Agrupa las pendientes por su sección (nombre del padre), para carpeta + círculos. */
function groupBySection(
  pend: PendingEval[],
): { section: string | null; items: PendingEval[] }[] {
  const out: { section: string | null; items: PendingEval[] }[] = []
  for (const p of pend) {
    const key = p.subName ?? null
    let g = out.find((x) => x.section === key)
    if (!g) {
      g = { section: key, items: [] }
      out.push(g)
    }
    g.items.push(p)
  }
  return out
}

function pickEven<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const out: T[] = []
  const step = (arr.length - 1) / (n - 1)
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)])
  return out
}

function situationCard(
  s: Situation,
  subject: Subject,
  res: ReturnType<typeof minGradeToPass>,
  maxFinal: number,
): { icon: ReactNode; tone: Tone; title: string; sub: string } {
  const { scale } = subject
  const need = formatGrade(res.needed)
  switch (s) {
    case 'cerrado_aprobado':
      return { icon: <CheckCircleIcon className="h-6 w-6" />, tone: 'green', title: 'Ramo aprobado', sub: `Tu nota final es ${formatGrade(res.final)}.` }
    case 'cerrado_reprobado':
      return { icon: <XCircleIcon className="h-6 w-6" />, tone: 'red', title: 'Ramo reprobado', sub: `Tu nota final es ${formatGrade(res.final)}.` }
    case 'asegurado':
      return { icon: <CheckCircleIcon className="h-6 w-6" />, tone: 'green', title: 'Ya está aprobado', sub: `Aunque saques ${formatGrade(scale.min)} en lo que queda, igual apruebas.` }
    case 'facil':
      return { icon: <CheckCircleIcon className="h-6 w-6" />, tone: 'green', title: 'Puedes aprobar con facilidad', sub: `Necesitas cerca de ${need} en lo que queda.` }
    case 'medio':
      return { icon: <TargetIcon className="h-6 w-6" />, tone: 'amber', title: 'Todavía puedes aprobar', sub: `Necesitas cerca de ${need} en lo que queda.` }
    case 'dificil':
      return { icon: <AlertIcon className="h-6 w-6" />, tone: 'amber', title: 'Situación difícil', sub: `Necesitas ${need} (nota alta) en lo que queda.` }
    case 'imposible':
      return { icon: <AlertIcon className="h-6 w-6" />, tone: 'amber', title: 'Necesitas Remedial', sub: `Con lo que queda tu máximo es ${formatGrade(maxFinal)}. Para aprobar te quedaría dar Remedial u Optativa.` }
    default:
      return { icon: <CalculatorIcon className="h-6 w-6" />, tone: 'ink', title: 'Sin datos', sub: 'Agrega notas para calcular.' }
  }
}
