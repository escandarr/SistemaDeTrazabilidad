import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { PickingDetail, PickingRow, User } from '../types'
import { PesajeEditor } from '../components/PesajeEditor'

interface Props {
  user: User
  onChanged: () => Promise<void>
}

export function PickingPage({ user, onChanged }: Props) {
  const [rows, setRows] = useState<PickingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<PickingDetail | null>(null)
  const [busy, setBusy] = useState(false)

  const puedeConfirmar = user.rol === 'administrador' || user.rol === 'jefe_bodega'

  async function load() {
    setError('')
    try {
      setRows(await api.listPicking())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar picking')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function iniciar(solicitudId: number) {
    setBusy(true)
    setError('')
    try {
      setSel(await api.iniciarPicking(solicitudId))
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el picking')
    } finally {
      setBusy(false)
    }
  }

  async function abrir(pickingId: number) {
    setBusy(true)
    setError('')
    try {
      setSel(await api.getPicking(pickingId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el picking')
    } finally {
      setBusy(false)
    }
  }

  async function pesar(itemId: number, pesos: number[]) {
    if (!sel) return
    setError('')
    try {
      const upd = await api.pesarItem(sel.id, itemId, pesos)
      setSel({ ...sel, items: sel.items.map(i => (i.id === itemId ? upd : i)) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el pesaje')
      throw e
    }
  }

  async function confirmar() {
    if (!sel) return
    setBusy(true)
    setError('')
    try {
      setSel(await api.confirmarPicking(sel.id))
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar el picking')
    } finally {
      setBusy(false)
    }
  }

  async function volver() {
    setSel(null)
    setLoading(true)
    await load()
  }

  // --- Detalle de un picking: pesaje por producto ---
  if (sel) {
    const todosPesados = sel.items.every(i => i.peso_neto !== null)
    const confirmado = sel.estado === 'confirmado'

    return (
      <>
        <div className="content-head">
          <div>
            <h2 className="section-title" style={{ marginBottom: 2 }}>
              SOL-{String(sel.solicitud_id).padStart(3, '0')} · {sel.obra}
            </h2>
            <span className="td--muted" style={{ fontSize: 13 }}>{sel.sistema}</span>
          </div>
          <button className="btn btn--secondary" onClick={volver} disabled={busy}>Volver al listado</button>
        </div>

        {error && <div className="alert alert--warning">{error}</div>}
        {confirmado && (
          <div className="alert alert--success">
            Picking confirmado. Queda disponible en Despacho para la salida formal.
          </div>
        )}

        <div className="item-grid">
          {sel.items.map(item => (
            <div key={item.id} className="card">
              <div className="content-head" style={{ marginBottom: 10 }}>
                <div>
                  <div className="card__title" style={{ marginBottom: 0 }}>{item.descripcion}</div>
                  <div className="td--sub">{item.producto_id}</div>
                </div>
                {item.peso_neto !== null ? (
                  <span className="badge badge--ok">Pesado</span>
                ) : (
                  <span className="badge badge--pendiente">Pendiente</span>
                )}
              </div>

              <div className="pesaje-total" style={{ marginTop: 0, marginBottom: 12 }}>
                <span>Requerido <strong>{item.cantidad_teorica ?? '—'} {item.unidad}</strong></span>
                {item.unidad !== 'un' && <span>Tara por bulto <strong>{item.tara_unitaria} kg</strong></span>}
                {item.peso_neto !== null && (
                  <span>
                    Registrado: bruto <strong>{item.peso_bruto}</strong> · tara <strong>−{item.peso_tara}</strong> · neto{' '}
                    <strong>{item.peso_neto} {item.unidad}</strong>
                  </span>
                )}
              </div>

              {!confirmado && (
                <PesajeEditor
                  unidad={item.unidad}
                  taraUnitaria={item.tara_unitaria}
                  onSave={pesos => pesar(item.id, pesos)}
                  saveLabel={item.peso_neto !== null ? 'Reemplazar pesaje' : 'Guardar pesaje'}
                />
              )}
            </div>
          ))}
        </div>

        {!confirmado && (
          <div className="nav-row">
            <button className="btn btn--secondary" onClick={volver} disabled={busy}>Volver</button>
            {puedeConfirmar ? (
              <button className="btn btn--primary" onClick={confirmar} disabled={busy || !todosPesados}>
                {busy ? 'Confirmando…' : todosPesados ? 'Confirmar picking' : 'Faltan productos por pesar'}
              </button>
            ) : (
              <button className="btn btn--primary" disabled>
                Confirma el jefe de bodega
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  // --- Listado ---
  return (
    <>
      <div className="content-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Solicitudes por preparar</h2>
      </div>

      {error && <div className="alert alert--warning">{error}</div>}

      {loading ? (
        <div className="empty">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="empty">No hay solicitudes esperando picking. Las nuevas solicitudes enviadas aparecerán aquí.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra</th>
                <th>Sistema</th>
                <th>m²</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.solicitud_id}>
                  <td className="td--code">SOL-{String(r.solicitud_id).padStart(3, '0')}</td>
                  <td>{r.obra}</td>
                  <td className="td--muted">{r.sistema}</td>
                  <td className="td--num">{r.m2}</td>
                  <td>
                    {r.estado_picking === null ? (
                      <span className="badge badge--enviada">Por iniciar</span>
                    ) : r.estado_picking === 'confirmado' ? (
                      <span className="badge badge--ok">Confirmado</span>
                    ) : (
                      <span className="badge badge--pendiente">Pesando</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.picking_id === null ? (
                      <button className="btn btn--primary btn--sm" onClick={() => iniciar(r.solicitud_id)} disabled={busy}>
                        Iniciar picking
                      </button>
                    ) : (
                      <button className="btn btn--secondary btn--sm" onClick={() => abrir(r.picking_id!)} disabled={busy}>
                        {r.estado_picking === 'confirmado' ? 'Ver detalle' : 'Continuar pesaje'}
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
