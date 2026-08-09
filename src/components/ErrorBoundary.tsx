import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Red de seguridad: si algún componente lanza un error en render, en vez de dejar
 * la pantalla en blanco muestra una pantalla de recuperación (y el detalle del error
 * para poder diagnosticarlo). Los datos del usuario están a salvo (localStorage/nube).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola para diagnóstico.
    console.error('App crash capturado por ErrorBoundary:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
        <img src="/logoapp.png" alt="Brody" className="h-14 w-14 rounded-2xl object-contain" />
        <h1 className="text-xl font-bold text-ink">Ups, algo se cayó</h1>
        <p className="max-w-xs text-sm text-ink/55">
          Recarga la app para seguir. Tus ramos y notas están a salvo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-ink px-6 py-3 text-[15px] font-semibold text-surface active:opacity-90"
        >
          Recargar
        </button>
        <pre className="mt-2 max-h-40 max-w-full overflow-auto rounded-xl bg-ink/5 p-3 text-left text-[11px] leading-relaxed text-ink/50">
          {String(error?.stack || error?.message || error)}
        </pre>
      </div>
    )
  }
}
