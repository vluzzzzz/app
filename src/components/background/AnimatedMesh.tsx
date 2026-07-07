import type { CSSProperties } from 'react'
import { useAppStore } from '../../store/useAppStore'

/**
 * Fondo "aesthetic": orbes de acento que orbitan + VIÑETA (profundidad) + grano.
 * TEMP: soporta 3 variantes y 2 niveles de grano para que Angel elija en vivo
 * (selector en Apariencia). Cuando decida, se fija la ganadora y se limpia.
 * - Variante 1: claro sutil / oscuro dramático (glow tipo póster).
 * - Variante 2: blanco + profundidad (conservador).
 * - Variante 3: más inmersivo/colorido (orbes grandes + lavado de acento).
 * Respeta `lite` (orbes quietos) y el perf móvil (grano estático, sin mix-blend).
 */

type Orb = {
  size: number
  r: number
  dur: number
  dir: 'cw' | 'ccw'
  o: number
  light?: boolean // usa --accent-light (variación de color)
}

const VARIANTS: Record<number, { light: Orb[]; dark: Orb[] }> = {
  1: {
    light: [
      { size: 720, r: 150, dur: 15, dir: 'cw', o: 0.26 },
      { size: 620, r: 130, dur: 19, dir: 'ccw', o: 0.2, light: true },
    ],
    dark: [
      { size: 760, r: 160, dur: 15, dir: 'cw', o: 0.5 },
      { size: 640, r: 140, dur: 19, dir: 'ccw', o: 0.4, light: true },
    ],
  },
  2: {
    light: [
      { size: 640, r: 140, dur: 16, dir: 'cw', o: 0.2 },
      { size: 560, r: 120, dur: 20, dir: 'ccw', o: 0.16, light: true },
    ],
    dark: [
      { size: 660, r: 150, dur: 16, dir: 'cw', o: 0.28 },
      { size: 580, r: 130, dur: 20, dir: 'ccw', o: 0.22, light: true },
    ],
  },
  3: {
    light: [
      { size: 820, r: 170, dur: 14, dir: 'cw', o: 0.4 },
      { size: 720, r: 150, dur: 17, dir: 'ccw', o: 0.32, light: true },
      { size: 560, r: 120, dur: 21, dir: 'cw', o: 0.26 },
    ],
    dark: [
      { size: 860, r: 180, dur: 14, dir: 'cw', o: 0.55 },
      { size: 740, r: 150, dur: 17, dir: 'ccw', o: 0.45, light: true },
      { size: 560, r: 120, dur: 21, dir: 'cw', o: 0.4 },
    ],
  },
}

// Posiciones fijas para el modo lite (repartidas, fondo estático).
const STATIC_POS = [
  'translate(-120px,-96px)',
  'translate(120px,108px)',
  'translate(0px,140px)',
]

function vignette(variant: number, dark: boolean): string {
  if (dark) {
    const edge = variant === 2 ? 0.35 : variant === 3 ? 0.55 : 0.5
    return `radial-gradient(circle at 50% 38%, transparent 45%, rgb(0 0 0 / ${edge}) 100%)`
  }
  const edge = variant === 2 ? 0.04 : 0.05
  return `radial-gradient(circle at 50% 38%, transparent 55%, rgb(17 24 39 / ${edge}) 100%)`
}

export function AnimatedMesh() {
  const isDark = useAppStore((s) => s.theme === 'dark')
  const lite = useAppStore((s) => s.lite)
  const bgVariant = useAppStore((s) => s.bgVariant)
  const grain = useAppStore((s) => s.grain)

  const orbs = (VARIANTS[bgVariant] ?? VARIANTS[1])[isDark ? 'dark' : 'light']
  const wash = bgVariant === 3

  const grainOpacity =
    grain === 'marked' ? (isDark ? 0.1 : 0.13) : isDark ? 0.05 : 0.07
  const grainFreq = grain === 'marked' ? 0.85 : 0.9

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-surface">
      {/* Orbes que orbitan (o quietos en modo lite) */}
      {orbs.map((b, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={
            {
              width: b.size,
              height: b.size,
              background: `radial-gradient(circle, rgb(var(${
                b.light ? '--accent-light' : '--accent'
              })) 0%, transparent 70%)`,
              opacity: b.o,
              ...(lite
                ? {
                    transform: `translate(-50%,-50%) ${STATIC_POS[i] ?? ''}`,
                  }
                : {
                    animation: `${
                      b.dir === 'cw' ? 'mesh-orbit-cw' : 'mesh-orbit-ccw'
                    } ${b.dur}s linear infinite`,
                    ['--orbit-r' as string]: `${b.r}px`,
                    willChange: 'transform',
                  }),
            } as CSSProperties
          }
        />
      ))}

      {/* Lavado de acento (variante 3, más colorido) */}
      {wash && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgb(var(--accent))',
            opacity: isDark ? 0.1 : 0.07,
          }}
        />
      )}

      {/* Viñeta: oscurece bordes = profundidad (la clave del look aesthetic) */}
      <div
        className="absolute inset-0"
        style={{ background: vignette(bgVariant, isDark) }}
      />

      {/* Micro-ruido ESTÁTICO (mezclar sobre el fondo en movimiento es carísimo en
          móvil): capa plana de opacidad baja = se compone una vez. */}
      <div className="absolute inset-0" style={{ opacity: grainOpacity }}>
        <svg className="h-full w-full">
          <filter id="grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={grainFreq}
              numOctaves={2}
              stitchTiles="stitch"
              seed={1}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-filter)" />
        </svg>
      </div>
    </div>
  )
}
