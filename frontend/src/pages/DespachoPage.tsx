import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { DespachoPendiente, DespachoRow } from '../types'
import { ESTADO_LABELS } from '../types'

interface Props {
  onChanged: () => Promise<void>
}

export function DespachoPage({ onChanged }: Props) {
  const [pendientes, setPendientes] = useState<DespachoPendiente[]>([])
  const [despachos, setDespachos] = useState<DespachoRow[]>([])
  const [guias, setGuias] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setError('')
    try {
      const [pend, desp] = await Promise.all([api.listDespachosPendientes(), api.listDespachos()])
      setPendientes(pend)
      setDespachos(desp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar despachos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function despachar(pickingId: number) {
    setBusy(true)
    setError('')
    try {
      await api.crearDespacho(pickingId, guias[pickingId]?.trim() || null)
      await load()
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar el despacho')
    } finally {
      setBusy(false)
    }
  }

  async function cerrar(despachoId: number) {
    setBusy(true)
    setError('')
    try {
      await api.cerrarSinDevolucion(despachoId)
      await load()
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la solicitud')
    } finally {
      setBusy(false)
    }
  }

  async function descargarCsv(d: DespachoRow) {
    setError('')
    try {
      await api.descargarCsv(`/despacho/${d.id}/csv`, `despacho_${d.id}_avesoft.csv`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el CSV')
    }
  }

  if (loading) return <div className="empty">Cargando…</div>

  return (
    <>
      {error && <div className="alert alert--warning">{error}</div>}

      <h2 className="section-title">Listos para despachar</h2>

      {pendientes.length === 0 ? (
        <div className="empty">No hay pickings confirmados en espera. Confirma un picking para despacharlo.</div>
      ) : (
        pendientes.map(p => (
          <div key={p.picking_id} className="card" style={{ marginBottom: 12 }}>
            <div className="content-head" style={{ marginBottom: 10 }}>
              <div>
                <div className="card__title" style={{ marginBottom: 0 }}>
                  SOL-{String(p.solicitud_id).padStart(3, '0')} · {p.obra}
                </div>
                <div className="card__sub">{p.sistema}</div>
              </div>
              <span className="td--num" style={{ fontSize: 15, fontWeight: 600 }}>{p.total_neto_kg} kg netos</span>
            </div>

            {p.items.map(i => (
              <div key={i.producto_id} className="resumen-item">
                <div>
                  <div className="resumen-item__name">{i.descripcion}</div>
                  <div className="td--sub">{i.producto_id}</div>
                </div>
                <div className="resumen-item__amount">{i.peso_neto} {i.unidad}</div>
              </div>
            ))}

            <div className="pesaje-row" style={{ marginTop: 14 }}>
              <input
                className="form-input"
                type="text"
                placeholder="N° guía Avesoft (opcional)"
                aria-label="Número de guía Avesoft"
                value={guias[p.picking_id] ?? ''}
                onChange={e => setGuias({ ...guias, [p.picking_id]: e.target.value })}
                disabled={busy}
              />
              <button className="btn btn--primary" onClick={() => despachar(p.picking_id)} disabled={busy}>
                {busy ? 'Procesando…' : 'Confirmar despacho'}
              </button>
            </div>
          </div>
        ))
      )}

      <h2 className="section-title" style={{ marginTop: 28 }}>Despachos realizados</h2>

      {despachos.length === 0 ? (
        <div className="empty">Aún no hay despachos registrados.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra</th>
                <th>Fecha</th>
                <th>Neto</th>
                <th>Guía</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {despachos.map(d => (
                <tr key={d.id}>
                  <td className="td--code">DSP-{String(d.id).padStart(3, '0')}</td>
                  <td>{d.obra}</td>
                  <td className="td--num td--muted">{d.fecha ? d.fecha.split('T')[0] : '—'}</td>
                  <td className="td--num">{d.total_neto_kg} kg</td>
                  <td className="td--muted">{d.guia_avesoft_ref ?? '—'}</td>
                  <td>
                    <span className={`badge badge--${d.estado_solicitud}`}>{ESTADO_LABELS[d.estado_solicitud]}</span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn--secondary btn--sm" onClick={() => descargarCsv(d)}>
                      CSV Avesoft
                    </button>
                    {d.estado_solicitud === 'despachada' && (
                      <button
                        className="btn btn--secondary btn--sm"
                        style={{ marginLeft: 8 }}
                        onClick={() => cerrar(d.id)}
                        disabled={busy}
                        title="La obra consumió todo el material: cierra la solicitud sin devolución"
                      >
                        Cerrar sin devolución
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
