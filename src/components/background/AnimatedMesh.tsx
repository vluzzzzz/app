import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'

/**
 * Fondo "ASMR": blobs de gradiente que flotan lentamente detrás del contenido.
 * Se adapta al tema: pastel suave en claro, vibrante en oscuro.
 */
const BLOBS = [
  { color: '#8b5cf6', size: 460, x: '-10%', y: '-8%', dur: 18, dx: 60, dy: 40 },
  { color: '#ec4899', size: 400, x: '65%', y: '5%', dur: 22, dx: -50, dy: 60 },
  { color: '#06b6d4', size: 420, x: '10%', y: '60%', dur: 20, dx: 70, dy: -50 },
  { color: '#f59e0b', size: 340, x: '70%', y: '65%', dur: 26, dx: -60, dy: -40 },
]

export function AnimatedMesh() {
  const theme = useAppStore((s) => s.theme)
  const isDark = theme === 'dark'

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-surface">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            background: b.color,
            filter: isDark ? 'blur(90px)' : 'blur(100px)',
            opacity: isDark ? 0.5 : 0.28,
          }}
          animate={{
            x: [0, b.dx, 0],
            y: [0, b.dy, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* Velo para dar contraste al texto (oscuro en dark, claro en light). */}
      <div
        className={
          isDark ? 'absolute inset-0 bg-[#0b0b12]/40' : 'absolute inset-0 bg-white/50'
        }
      />
    </div>
  )
}
