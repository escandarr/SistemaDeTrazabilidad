import type { Page, Solicitud, User } from '../types'
import { ESTADO_LABELS } from '../types'

interface Props {
  user: User
  solicitudes: Solicitud[]
  navigate: (p: Page) => void
}

export function SolicitudesPage({ user, solicitudes, navigate }: Props) {
  const puedeCrear = user.rol === 'supervisor' || user.rol === 'administrador'

  return (
    <>
      <div className="content-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Todas las solicitudes</h2>
        {puedeCrear && (
          <button className="btn btn--primary" onClick={() => navigate('nueva-solicitud')}>
            + Nueva solicitud
          </button>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ color: '#64748b', fontSize: 15 }}>Sin solicitudes aún</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra</th>
                <th>Sistema</th>
                <th>m²</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>SOL-{String(s.id).padStart(3, '0')}</td>
                  <td>{s.obra}</td>
                  <td style={{ color: '#64748b' }}>{s.sistema}</td>
                  <td className="td--num">{s.m2}</td>
                  <td style={{ color: '#64748b' }}>{s.creado_at.split('T')[0]}</td>
                  <td><span className={`badge badge--${s.estado}`}>{ESTADO_LABELS[s.estado]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
