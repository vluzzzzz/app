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
