import type { Variants, Transition } from 'framer-motion'

/**
 * Curvas de easing rescatadas de apps con animaciones muy fluidas (Material 3 + custom).
 * Se usan en transiciones de Framer Motion para dar la sensación "ASMR".
 */
/** Tupla de curva de Bézier (lo que Framer Motion espera en `ease`). */
type Bezier = [number, number, number, number]

export const EASE = {
  /** Frenado ultra suave (expo-out). Ideal para entradas. */
  smooth: [0.11, 1, 0, 1] as Bezier,
  /** Rebote / overshoot: el efecto "boing" satisfactorio. */
  overshoot: [0.34, 1.45, 0.5, 1] as Bezier,
  /** Overshoot más marcado. */
  overshootBig: [0.37, 1.42, 0.37, 1] as Bezier,
  /** Estándar suave. */
  standard: [0, 0, 0.5, 1] as Bezier,
  /** Material 3 "emphasized": la curva estrella para abrir/mover cosas en PC. */
  emphasized: [0.2, 0, 0, 1] as Bezier,
  /** Material 3 "emphasized decelerate": algo que entra y frena muy suave. */
  decel: [0.05, 0.7, 0.1, 1] as Bezier,
  /** Material 3 "emphasized accelerate": algo que sale/se cierra. */
  accel: [0.3, 0, 0.8, 0.15] as Bezier,
}

/** Duraciones base (segundos) — cortas = se siente rápido y "caro". */
export const DUR = {
  /** Feedback al presionar (botón, ripple). */
  press: 0.09,
  /** Abrir/mover un panel u hoja. */
  panel: 0.24,
  /** Movimiento grande (página, overlay). */
  large: 0.42,
}

/** ¿El usuario pidió menos movimiento? (accesibilidad). SSR-safe. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Contenedor con entrada escalonada para dashboards (Home PC). */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
}

/** Item de dashboard: sube un poco, se aclara y crece un pelín con la curva emphasized. */
export const dashItem: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.44, ease: EASE.decel },
  },
}

/** Entrada premium "blur-in": aparece desenfocado y se aclara mientras crece. */
export const fadeBlurIn: Variants = {
  initial: { opacity: 0, filter: 'blur(16px)', scale: 0.96 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.5, ease: EASE.smooth },
  },
  exit: {
    opacity: 0,
    filter: 'blur(12px)',
    scale: 0.98,
    transition: { duration: 0.25, ease: EASE.standard },
  },
}

/** Entrada sutil para items de lista (desliza un poco y crece un pelín). */
export const cardEnter: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
}

/** Transición con rebote lista para usar. */
export const overshootTransition: Transition = {
  duration: 0.55,
  ease: EASE.overshoot,
}
