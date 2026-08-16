import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/useAppStore'
import { CLASS_TYPE_LABEL, DAY_NAMES, classesForDay } from '../../lib/schedule'
import { accentRgb } from '../../lib/accents'

/**
 * Hoja imprimible del horario (A4 apaisada, estilo horario de colegio).
 * Se monta al tocar "Imprimir": abre el diálogo del navegador (donde también
 * se puede "Guardar como PDF") y se desmonta al cerrar. En pantalla es
 * invisible; solo existe para la impresión (reglas @media print en index.css).
 */
export function HorarioPrint({ onDone }: { onDone: () => void }) {
  const classes = useAppStore((s) => s.classes)
  const subjects = useAppStore((s) => s.subjects)
  const userName = useAppStore((s) => s.userName)

  useEffect(() => {
    const after = () => onDone()
    window.addEventListener('afterprint', after)
    // Espera un frame a que el portal esté pintado antes de abrir el diálogo.
    const t = setTimeout(() => window.print(), 60)
    return () => {
      window.removeEventListener('afterprint', after)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Ramo'
  const subjectColor = (id: string) =>
    `rgb(${accentRgb(subjects.find((s) => s.id === id)?.color ?? 'gray')})`

  // Días a mostrar: Lunes-Viernes siempre; sábado/domingo solo si tienen clases.
  const dias = [0, 1, 2, 3, 4, 5, 6].filter(
    (d) => d < 5 || classesForDay(classes, d).length > 0,
  )

  return createPortal(
    <div id="horario-print" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '14px',
          borderBottom: '2px solid #18181b',
          paddingBottom: '8px',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#18181b', margin: 0 }}>
          Horario{userName ? ` de ${userName}` : ''}
        </h1>
        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
          Hecho con Brody · brrody.app
        </span>
      </div>

      {/* Grilla por días */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dias.length}, 1fr)`,
          gap: '8px',
          alignItems: 'start',
        }}
      >
        {dias.map((d) => {
          const bloques = classesForDay(classes, d)
          return (
            <div key={d}>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#18181b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '6px 0',
                  borderBottom: '1.5px solid #18181b',
                  marginBottom: '8px',
                }}
              >
                {DAY_NAMES[d]}
              </div>
              {bloques.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#a1a1aa', margin: '10px 0' }}>
                  —
                </p>
              ) : (
                bloques.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      gap: '6px',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      marginBottom: '6px',
                      breakInside: 'avoid',
                    }}
                  >
                    <span
                      style={{
                        width: '3px',
                        borderRadius: '99px',
                        background: subjectColor(c.subjectId),
                        flexShrink: 0,
                        alignSelf: 'stretch',
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#18181b',
                          margin: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {c.start} – {c.end}
                      </p>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#27272a', margin: '2px 0 0' }}>
                        {subjectName(c.subjectId)}
                      </p>
                      <p style={{ fontSize: '9.5px', color: '#71717a', margin: '1px 0 0' }}>
                        {[c.room, CLASS_TYPE_LABEL[c.type], c.professor].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
