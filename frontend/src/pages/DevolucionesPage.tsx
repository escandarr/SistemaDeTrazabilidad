import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { DevolucionAbierta, DevolucionRow } from '../types'
import { PesajeEditor } from '../components/PesajeEditor'

interface Props {
  onChanged: () => Promise<void>
}

export function DevolucionesPage({ onChanged }: Props) {
  const [abiertos, setAbiertos] = useState<DevolucionAbierta[]>([])
  const [devoluciones, setDevoluciones] = useState<DevolucionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [sel, setSel] = useState<DevolucionAbierta | null>(null)
  const [pesos, setPesos] = useState<Record<string, number[]>>({})
  const [guia, setGuia] = useState('')

  async function load() {
    setError('')
    try {
      const [ab, dev] = await Promise.all([api.listDespachosAbiertos(), api.listDevoluciones()])
      setAbiertos(ab)
      setDevoluciones(dev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar devoluciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function abrir(d: DevolucionAbierta) {
    setSel(d)
    setPesos({})
    setGuia('')
    setError('')
  }

  const itemsConPeso = sel
    ? sel.items
        .filter(i => (pesos[i.producto_id] ?? []).length > 0)
        .map(i => ({ producto_id: i.producto_id, pesos_bultos: pesos[i.producto_id] }))
    : []

  async function registrar() {
    if (!sel || itemsConPeso.length === 0) return
    setBusy(true)
    setError('')
    try {
      await api.registrarDevolucion({
        despacho_id: sel.despacho_id,
        guia_ref: guia.trim() || null,
        items: itemsConPeso,
      })
      setSel(null)
      setLoading(true)
      await load()
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la devolución')
    } finally {
      setBusy(false)
    }
  }

  async function descargarCsv(dv: DevolucionRow) {
    setError('')
    try {
      await api.descargarCsv(`/devoluciones/${dv.id}/csv`, `devolucion_${dv.id}_avesoft.csv`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el CSV')
    }
  }

  if (loading) return <div className="empty">Cargando…</div>

  // --- Pesaje del material que vuelve de una obra ---
  if (sel) {
    return (
      <>
        <div className="content-head">
          <div>
            <h2 className="section-title" style={{ marginBottom: 2 }}>
              Devolución · {sel.obra}
            </h2>
            <span className="td--muted" style={{ fontSize: 13 }}>
              DSP-{String(sel.despacho_id).padStart(3, '0')} · SOL-{String(sel.solicitud_id).padStart(3, '0')}
            </span>
          </div>
          <button className="btn btn--secondary" onClick={() => setSel(null)} disabled={busy}>Cancelar</button>
        </div>

        {error && <div className="alert alert--warning">{error}</div>}

        <div className="alert alert--warning" style={{ background: 'var(--losa-100)', borderLeftColor: 'var(--gris-400)', color: 'var(--gris-600)' }}>
          Pesa solo lo que volvió de obra. Lo no devuelto queda como consumo de la obra y la solicitud se cierra.
        </div>

        <div className="item-grid">
          {sel.items.map(item => (
            <div key={item.producto_id} className="card">
              <div className="content-head" style={{ marginBottom: 10 }}>
                <div>
                  <div className="card__title" style={{ marginBottom: 0 }}>{item.descripcion}</div>
                  <div className="td--sub">{item.producto_id}</div>
                </div>
                <span className="td--num td--muted">Despachado: {item.despachado_kg} {item.unidad}</span>
              </div>
              <PesajeEditor
                unidad={item.unidad}
                taraUnitaria={item.tara_unitaria}
                disabled={busy}
                onChange={p => setPesos(prev => ({ ...prev, [item.producto_id]: p }))}
              />
            </div>
          ))}
        </div>

        <div className="pesaje-row" style={{ marginTop: 18 }}>
          <input
            className="form-input"
            type="text"
            placeholder="N° guía de ingreso (opcional)"
            aria-label="Número de guía de ingreso"
            value={guia}
            onChange={e => setGuia(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn--primary" onClick={registrar} disabled={busy || itemsConPeso.length === 0}>
            {busy ? 'Registrando…' : 'Registrar devolución'}
          </button>
        </div>
      </>
    )
  }

  // --- Listados ---
  return (
    <>
      {error && <div className="alert alert--warning">{error}</div>}

      <h2 className="section-title">Despachos abiertos</h2>

      {abiertos.length === 0 ? (
        <div className="empty">No hay despachos esperando devolución. Aparecerán aquí hasta que la solicitud se cierre.</div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra</th>
                <th>Fecha despacho</th>
                <th>Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {abiertos.map(d => (
                <tr key={d.despacho_id}>
                  <td className="td--code">DSP-{String(d.despacho_id).padStart(3, '0')}</td>
                  <td>{d.obra}</td>
                  <td className="td--num td--muted">{d.fecha_despacho ? d.fecha_despacho.split('T')[0] : '—'}</td>
                  <td className="td--num">{d.items.length}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn--primary btn--sm" onClick={() => abrir(d)}>
                      Registrar devolución
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Devoluciones registradas</h2>

      {devoluciones.length === 0 ? (
        <div className="empty">Aún no hay devoluciones registradas.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra</th>
                <th>Fecha</th>
                <th>Devuelto</th>
                <th>Consumo real</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.map(dv => (
                <tr key={dv.id}>
                  <td className="td--code">DEV-{String(dv.id).padStart(3, '0')}</td>
                  <td>{dv.obra}</td>
                  <td className="td--num td--muted">{dv.fecha.split('T')[0]}</td>
                  <td className="td--num">{dv.total_devuelto_kg} kg</td>
                  <td className="td--num" style={{ fontWeight: 600 }}>{dv.consumo_real_kg} kg</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn--secondary btn--sm" onClick={() => descargarCsv(dv)}>
                      CSV Avesoft
                    </button>
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
