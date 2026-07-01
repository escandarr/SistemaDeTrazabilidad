import { TUTORIALES } from '../tours'
import type { Tutorial } from '../tours'

interface Props {
  onStart: (t: Tutorial) => void
}

export function TutorialesPage({ onStart }: Props) {
  return (
    <>
      <div className="content-head">
        <div>
          <h2 className="section-title" style={{ marginBottom: 2 }}>Tutoriales guiados</h2>
          <span className="td--muted" style={{ fontSize: 13 }}>
            Recorridos paso a paso para conocer todo lo que puedes hacer. Puedes repetirlos cuando quieras.
          </span>
        </div>
      </div>

      <div className="tut-grid">
        {TUTORIALES.map(t => (
          <div key={t.id} className="tut-card">
            <span className="tut-card__n">{t.numero}</span>
            <div className="tut-card__t">{t.titulo}</div>
            <div className="tut-card__d">{t.resumen}</div>
            <div className="tut-card__foot">
              <span className="td--sub">{t.steps.length} pasos</span>
              <button className="btn btn--primary btn--sm" onClick={() => onStart(t)}>Iniciar tutorial</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
