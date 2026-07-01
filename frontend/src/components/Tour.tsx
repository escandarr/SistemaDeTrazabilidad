import { useEffect, useState } from 'react'
import type { Page } from '../types'
import type { TourStep } from '../tours'

interface Rect { top: number; left: number; width: number; height: number }

interface Props {
  steps: TourStep[]
  navigate: (p: Page) => void
  onClose: () => void
}

const CARD_W = 340

export function Tour({ steps, navigate, onClose }: Props) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = steps[i]

  // Al cambiar de paso: navega a la página y busca el ancla (con reintentos,
  // porque el elemento puede montarse un instante después del navigate).
  useEffect(() => {
    let cancelled = false
    if (step.page) navigate(step.page)
    if (!step.anchor) {
      setRect(null)
      return
    }
    let tries = 0
    const buscar = () => {
      if (cancelled) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        window.setTimeout(() => {
          if (cancelled) return
          const r = el.getBoundingClientRect()
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        }, 180)
      } else if (tries++ < 40) {
        window.setTimeout(buscar, 50)
      } else {
        setRect(null)
      }
    }
    const t = window.setTimeout(buscar, 80)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // Recalcula la posición si cambia el tamaño o hay scroll.
  useEffect(() => {
    const recalc = () => {
      if (!step.anchor) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, true)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI(n => Math.min(steps.length - 1, n + 1))
      else if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length, onClose])

  // Posición del globo: bajo el elemento si hay espacio, si no arriba; centrado sin ancla.
  let cardStyle: React.CSSProperties
  if (rect) {
    const below = rect.top + rect.height + 16 + 220 < window.innerHeight
    const top = below ? rect.top + rect.height + 14 : Math.max(16, rect.top - 14 - 220)
    let left = rect.left + rect.width / 2 - CARD_W / 2
    left = Math.max(16, Math.min(left, window.innerWidth - CARD_W - 16))
    cardStyle = { top, left }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const last = i === steps.length - 1

  return (
    <div className="tour" role="dialog" aria-modal="true">
      <div className={`tour__block ${rect ? '' : 'tour__block--dim'}`} />
      {rect && (
        <div
          className="tour__spot"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div className="tour__card" style={cardStyle}>
        <button className="tour__x" onClick={onClose} aria-label="Cerrar tutorial">×</button>
        <div className="tour__count">{i + 1} / {steps.length}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour__nav">
          <button className="btn btn--secondary btn--sm" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
          {last ? (
            <button className="btn btn--primary btn--sm" onClick={onClose}>Finalizar</button>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={() => setI(i + 1)}>Siguiente</button>
          )}
        </div>
      </div>
    </div>
  )
}
