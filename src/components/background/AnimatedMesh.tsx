import type { CSSProperties } from 'react'
import { useAppStore } from '../../store/useAppStore'

/**
 * "Dynamic Micro-Grainy Mesh Gradient" (técnica de stepbro):
 * - Base BLANCA dominante.
 * - Mesh gradient del color de acento formado por 2–3 círculos que **orbitan**
 *   alrededor del centro (rotate + translate + contra-rotate), en direcciones
 *   opuestas → movimiento orgánico, sin apelotonarse al medio ni costuras.
 * - Micro-ruido fractal SVG (feTurbulence) animado, fusionado con mix-blend.
 */

// Círculos que orbitan (radial-gradient que se desvanece a transparente).
const ORBS: {
  size: number
  r: number
  dur: number
  dir: 'cw' | 'ccw'
  o: number
}[] = [
  { size: 640, r: 150, dur: 20, dir: 'cw', o: 0.2 },
  { size: 560, r: 120, dur: 26, dir: 'ccw', o: 0.16 },
  { size: 600, r: 200, dur: 34, dir: 'cw', o: 0.12 },
]

export function AnimatedMesh() {
  const isDark = useAppStore((s) => s.theme === 'dark')

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-surface">
      {/* Mesh gradient: círculos orbitando alrededor del centro */}
      {ORBS.map((b, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={
            {
              width: b.size,
              height: b.size,
              background:
                'radial-gradient(circle, rgb(var(--accent)) 0%, transparent 70%)',
              opacity: isDark ? b.o + 0.06 : b.o,
              animation: `${
                b.dir === 'cw' ? 'mesh-orbit-cw' : 'mesh-orbit-ccw'
              } ${b.dur}s linear infinite`,
              '--orbit-r': `${b.r}px`,
              willChange: 'transform',
            } as CSSProperties
          }
        />
      ))}

      {/* Micro-ruido fractal animado (feTurbulence) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: isDark ? 0.5 : 0.4,
          mixBlendMode: isDark ? 'screen' : 'overlay',
        }}
      >
        <svg className="h-full w-full">
          <filter id="grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              stitchTiles="stitch"
              seed={1}
            >
              <animate
                attributeName="seed"
                values="1;2;3;4;5;6;7;8"
                dur="0.5s"
                repeatCount="indefinite"
                calcMode="discrete"
              />
            </feTurbulence>
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-filter)" />
        </svg>
      </div>
    </div>
  )
}
