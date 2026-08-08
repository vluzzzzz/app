/**
 * Fondo estático minimal: un color plano (off-white en claro, carbón en oscuro).
 * Sin orbes, sin grano, sin animación → look limpio y máximo rendimiento.
 * (Antes era un "grainy mesh" animado; se quitó por pedido de Angel.)
 */
export function AnimatedMesh() {
  return <div className="fixed inset-0 -z-10 bg-surface" />
}
