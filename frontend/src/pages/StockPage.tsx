import type { Producto } from '../types'

interface Props {
  stock: Producto[]
}

function getStatus(actual: number, minimo: number): 'ok' | 'low' | 'critical' {
  if (actual < minimo) return 'critical'
  if (actual <= minimo * 1.2) return 'low'
  return 'ok'
}

const STATUS_LABELS: Record<string, string> = {
  ok: 'OK',
  low: 'Bajo',
  critical: 'Crítico',
}

export function StockPage({ stock }: Props) {
  const criticals = stock.filter(s => getStatus(s.stock_actual, s.stock_minimo) === 'critical')
  const lows = stock.filter(s => getStatus(s.stock_actual, s.stock_minimo) === 'low')

  return (
    <>
      {criticals.length > 0 && (
        <div className="alert alert--warning">
          {criticals.length} material{criticals.length > 1 ? 'es' : ''} bajo stock mínimo —
          solicitar reposición urgente a proveedor.
        </div>
      )}

      <div className="content-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Stock actual</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {criticals.length > 0 && <span className="badge badge--critical">{criticals.length} críticos</span>}
          {lows.length > 0 && <span className="badge badge--low">{lows.length} bajo</span>}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Stock actual</th>
              <th>Mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(s => {
              const status = getStatus(s.stock_actual, s.stock_minimo)
              const pct = Math.min(100, Math.round((s.stock_actual / (s.stock_minimo * 2)) * 100))
              return (
                <tr key={s.codigo_avesoft}>
                  <td style={{ fontWeight: 500 }}>
                    {s.descripcion}
                    <div className="td--sub">{s.codigo_avesoft}</div>
                  </td>
                  <td>
                    <span className="td--num">{s.stock_actual} {s.unidad_medida}</span>
                    <div className={`stock-bar stock-bar--${status}`}>
                      <div className="stock-bar__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="td--num td--muted">{s.stock_minimo} {s.unidad_medida}</td>
                  <td>
                    <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
