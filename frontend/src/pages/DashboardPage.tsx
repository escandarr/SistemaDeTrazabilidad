import type { Page, Producto, Solicitud, User } from '../types'
import { ESTADO_LABELS } from '../types'

interface Props {
  user: User
  solicitudes: Solicitud[]
  stock: Producto[]
  navigate: (p: Page) => void
}

const PENDIENTES: Solicitud['estado'][] = ['borrador', 'enviada', 'en_picking']

export function DashboardPage({ user, solicitudes, stock, navigate }: Props) {
  const alerts = stock.filter(s => s.stock_actual < s.stock_minimo)
  const pendientes = solicitudes.filter(s => PENDIENTES.includes(s.estado)).length
  const recent = solicitudes.slice(0, 5)
  const hoy = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const metrics = [
    { label: 'Solicitudes', value: solicitudes.length, hint: 'totales', page: 'solicitudes' as Page },
    { label: 'Pendientes', value: pendientes, hint: 'en proceso', page: 'solicitudes' as Page },
    { label: 'Bajo mínimo', value: alerts.length, hint: 'materiales', page: 'stock' as Page, danger: alerts.length > 0 },
    { label: 'Productos', value: stock.length, hint: 'en inventario', page: 'stock' as Page },
  ]

  return (
    <>
      <div className="greeting">
        <div className="greeting__hi">Hola, {user.nombre.split(' ')[0]}</div>
        <div className="greeting__date" style={{ textTransform: 'capitalize' }}>{hoy}</div>
      </div>

      {alerts.length > 0 && (
        <div className="alert alert--warning" style={{ cursor: 'pointer' }} onClick={() => navigate('stock')}>
          {alerts.length} material{alerts.length > 1 ? 'es' : ''} bajo stock mínimo — ver inventario →
        </div>
      )}

      <div className="metrics">
        {metrics.map(m => (
          <button key={m.label} className="metric" onClick={() => navigate(m.page)}>
            <div className={`metric__value ${m.danger ? 'metric__value--danger' : ''}`}>{m.value}</div>
            <div className="metric__label">{m.label}</div>
            <div className="metric__hint">{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="content-head" style={{ marginTop: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Solicitudes recientes</h2>
        <button className="btn btn--secondary" onClick={() => navigate('solicitudes')}>Ver todas</button>
      </div>

      {recent.length === 0 ? (
        <div className="empty">Aún no hay solicitudes registradas.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Código</th><th>Obra</th><th>Sistema</th><th>m²</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {recent.map(s => (
                <tr key={s.id}>
                  <td className="td--code">SOL-{String(s.id).padStart(3, '0')}</td>
                  <td>{s.obra}</td>
                  <td className="td--muted">{s.sistema}</td>
                  <td className="td--num">{s.m2}</td>
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
