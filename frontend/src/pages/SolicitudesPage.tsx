import { Header } from '../components/Header'
import { User, Solicitud, Page } from '../mock'

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_picking: 'En Picking',
  despachado: 'Despachado',
}

interface Props {
  user: User
  solicitudes: Solicitud[]
  navigate: (p: Page) => void
  logout: () => void
}

export function SolicitudesPage({ user, solicitudes, navigate, logout }: Props) {
  return (
    <div className="app">
      <Header title="Solicitudes" user={user} onBack={() => navigate('dashboard')} onLogout={logout} />

      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Todas las solicitudes</h2>
          {user.rol === 'supervisor' && (
            <button
              className="btn btn--primary"
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => navigate('nueva-solicitud')}
            >
              + Nueva
            </button>
          )}
        </div>

        {solicitudes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ color: '#64748b', fontSize: 15 }}>Sin solicitudes aún</div>
          </div>
        ) : (
          solicitudes.map(s => (
            <div key={s.id} className="solicitud-row">
              <div>
                <div className="solicitud-row__id">{s.id} · {s.fecha}</div>
                <div className="solicitud-row__obra">{s.obra}</div>
                <div className="solicitud-row__meta">{s.sistema} · {s.m2} m²</div>
              </div>
              <span className={`badge badge--${s.estado}`}>{ESTADO_LABELS[s.estado]}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
