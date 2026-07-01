import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import type { ImportResult, Producto, Proveedor, RecetaDetalle, RecetaFull, UnidadMedida } from '../types'
import { SISTEMA_LABELS } from '../types'

type Tab = 'productos' | 'proveedores' | 'recetas'

const UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades (un)' },
]

const SISTEMAS = ['mma', 'epoxi', 'uretano']

const emptyProducto = {
  codigo_avesoft: '',
  descripcion: '',
  unidad_medida: 'kg' as UnidadMedida,
  proveedor_id: null as number | null,
  peso_tara_kg: null as number | null,
  stock_actual: 0,
  stock_minimo: 0,
  sustituto_id: null as string | null,
}

export function MaterialesPage() {
  const [tab, setTab] = useState<Tab>('productos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [recetas, setRecetas] = useState<RecetaFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Modales
  const [prodModal, setProdModal] = useState<typeof emptyProducto | null>(null)
  const [prodEditing, setProdEditing] = useState(false)
  const [provModal, setProvModal] = useState<{ id: number | null; nombre: string; peso_tara_kg: number } | null>(null)
  const [recetaModal, setRecetaModal] = useState<RecetaFull | null>(null)
  const [recetaNew, setRecetaNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const provName = (id: number | null) => proveedores.find(p => p.id === id)?.nombre ?? '—'

  async function load() {
    setError('')
    try {
      const [prods, provs, recs] = await Promise.all([
        api.listProductosAdmin(),
        api.listProveedores(),
        api.listRecetasFull(),
      ])
      setProductos(prods)
      setProveedores(provs)
      setRecetas(recs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // --- Import / export ---
  async function onImport(file: File) {
    setError('')
    setImportResult(null)
    setSaving(true)
    try {
      const res = await api.importarProductos(file)
      setImportResult(res)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar el archivo')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function exportar(path: string, filename: string) {
    setError('')
    try {
      await api.descargarCsv(path, filename)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar')
    }
  }

  // --- Productos ---
  async function guardarProducto() {
    if (!prodModal) return
    setSaving(true)
    setError('')
    try {
      if (prodEditing) {
        const { codigo_avesoft, ...rest } = prodModal
        void codigo_avesoft
        await api.actualizarProducto(prodModal.codigo_avesoft, rest)
      } else {
        await api.crearProducto(prodModal)
      }
      setProdModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarProducto(codigo: string) {
    if (!confirm(`¿Eliminar el producto ${codigo}?`)) return
    setError('')
    try {
      await api.eliminarProducto(codigo)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  // --- Proveedores ---
  async function guardarProveedor() {
    if (!provModal) return
    setSaving(true)
    setError('')
    try {
      if (provModal.id === null) {
        await api.crearProveedor({ nombre: provModal.nombre, peso_tara_kg: provModal.peso_tara_kg })
      } else {
        await api.actualizarProveedor(provModal.id, { nombre: provModal.nombre, peso_tara_kg: provModal.peso_tara_kg })
      }
      setProvModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el proveedor')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarProveedor(id: number) {
    if (!confirm('¿Eliminar este proveedor?')) return
    setError('')
    try {
      await api.eliminarProveedor(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  // --- Recetas ---
  async function guardarReceta() {
    if (!recetaModal) return
    setSaving(true)
    setError('')
    try {
      const detalle: RecetaDetalle[] = recetaModal.detalle
        .filter(d => d.producto_id && d.cantidad_por_m2 > 0)
        .map(d => ({ producto_id: d.producto_id, cantidad_por_m2: d.cantidad_por_m2 }))
      if (recetaNew) {
        await api.crearReceta({
          nombre_sistema: recetaModal.nombre_sistema,
          descripcion: recetaModal.descripcion,
          detalle,
        })
      } else {
        await api.actualizarReceta(recetaModal.id, {
          descripcion: recetaModal.descripcion,
          activa: recetaModal.activa,
          detalle,
        })
      }
      setRecetaModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la receta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty">Cargando catálogo…</div>

  return (
    <>
      <div className="tabs">
        {(['productos', 'proveedores', 'recetas'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'productos' ? 'Productos' : t === 'proveedores' ? 'Proveedores' : 'Recetas'}
          </button>
        ))}
      </div>

      {error && <div className="alert alert--warning">{error}</div>}

      {/* ===================== PRODUCTOS ===================== */}
      {tab === 'productos' && (
        <>
          <div className="content-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Catálogo de productos</h2>
            <div className="toolbar" data-tour="mat-toolbar">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && onImport(e.target.files[0])}
              />
              <button className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()} disabled={saving}>
                Importar CSV
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => exportar('/catalogo/productos/exportar', 'maestro_productos.csv')}>
                Exportar CSV
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => { setProdModal({ ...emptyProducto }); setProdEditing(false) }}>
                Nuevo producto
              </button>
            </div>
          </div>

          {importResult && (
            <div className={`alert ${importResult.errores.length ? 'alert--warning' : 'alert--success'}`}>
              Importación: {importResult.creados} creados, {importResult.actualizados} actualizados
              {importResult.errores.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {importResult.errores.slice(0, 8).map((er, i) => <li key={i}>{er}</li>)}
                  {importResult.errores.length > 8 && <li>… y {importResult.errores.length - 8} más</li>}
                </ul>
              )}
            </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Descripción</th><th>Unidad</th><th>Proveedor</th>
                  <th>Tara</th><th>Stock</th><th>Mínimo</th><th>Equivalente</th><th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.codigo_avesoft}>
                    <td className="td--code">{p.codigo_avesoft}</td>
                    <td>{p.descripcion}</td>
                    <td className="td--muted">{p.unidad_medida}</td>
                    <td className="td--muted">{provName(p.proveedor_id)}</td>
                    <td className="td--num">{p.peso_tara_kg ?? '—'}</td>
                    <td className="td--num">{p.stock_actual}</td>
                    <td className="td--num td--muted">{p.stock_minimo}</td>
                    <td className="td--muted">{p.sustituto_id ?? '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => { setProdModal({ ...emptyProducto, ...p }); setProdEditing(true) }}>Editar</button>
                      <button className="btn btn--secondary btn--sm" style={{ marginLeft: 6 }} onClick={() => eliminarProducto(p.codigo_avesoft)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===================== PROVEEDORES ===================== */}
      {tab === 'proveedores' && (
        <>
          <div className="content-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Proveedores</h2>
            <button className="btn btn--primary btn--sm" onClick={() => setProvModal({ id: null, nombre: '', peso_tara_kg: 0 })}>
              Nuevo proveedor
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Tara por envase (kg)</th><th></th></tr></thead>
              <tbody>
                {proveedores.map(p => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td className="td--num">{p.peso_tara_kg}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => setProvModal({ id: p.id, nombre: p.nombre, peso_tara_kg: p.peso_tara_kg })}>Editar</button>
                      <button className="btn btn--secondary btn--sm" style={{ marginLeft: 6 }} onClick={() => eliminarProveedor(p.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===================== RECETAS ===================== */}
      {tab === 'recetas' && (
        <>
          <div className="content-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Recetas (sistemas de piso)</h2>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => { setRecetaModal({ id: 0, nombre_sistema: 'mma', descripcion: '', activa: true, detalle: [] }); setRecetaNew(true) }}
            >
              Nueva receta
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sistema</th><th>Descripción</th><th>Materiales</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {recetas.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{SISTEMA_LABELS[r.nombre_sistema] ?? r.nombre_sistema}</td>
                    <td className="td--muted">{r.descripcion ?? '—'}</td>
                    <td className="td--num">{r.detalle.length}</td>
                    <td><span className={`badge ${r.activa ? 'badge--ok' : 'badge--borrador'}`}>{r.activa ? 'Activa' : 'Inactiva'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn--secondary btn--sm" onClick={() => { setRecetaModal({ ...r, detalle: r.detalle.map(d => ({ ...d })) }); setRecetaNew(false) }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===================== MODAL PRODUCTO ===================== */}
      {prodModal && (
        <div className="modal-overlay" onClick={() => !saving && setProdModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{prodEditing ? 'Editar producto' : 'Nuevo producto'}</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="p-codigo">Código Avesoft</label>
              <input id="p-codigo" className="form-input" value={prodModal.codigo_avesoft} disabled={prodEditing}
                onChange={e => setProdModal({ ...prodModal, codigo_avesoft: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-desc">Descripción</label>
              <input id="p-desc" className="form-input" value={prodModal.descripcion}
                onChange={e => setProdModal({ ...prodModal, descripcion: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="p-unidad">Unidad</label>
                <select id="p-unidad" className="form-input" value={prodModal.unidad_medida}
                  onChange={e => setProdModal({ ...prodModal, unidad_medida: e.target.value as UnidadMedida })}>
                  {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="p-prov">Proveedor</label>
                <select id="p-prov" className="form-input" value={prodModal.proveedor_id ?? ''}
                  onChange={e => setProdModal({ ...prodModal, proveedor_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="p-tara">Tara propia (kg, opcional)</label>
                <input id="p-tara" className="form-input" type="number" inputMode="decimal" value={prodModal.peso_tara_kg ?? ''}
                  placeholder="Usa la del proveedor"
                  onChange={e => setProdModal({ ...prodModal, peso_tara_kg: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="p-sust">Equivalente</label>
                <select id="p-sust" className="form-input" value={prodModal.sustituto_id ?? ''}
                  onChange={e => setProdModal({ ...prodModal, sustituto_id: e.target.value || null })}>
                  <option value="">Sin equivalente</option>
                  {productos.filter(p => p.codigo_avesoft !== prodModal.codigo_avesoft)
                    .map(p => <option key={p.codigo_avesoft} value={p.codigo_avesoft}>{p.codigo_avesoft} · {p.descripcion}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="p-stock">Stock actual</label>
                <input id="p-stock" className="form-input" type="number" inputMode="decimal" value={prodModal.stock_actual}
                  onChange={e => setProdModal({ ...prodModal, stock_actual: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="p-min">Stock mínimo</label>
                <input id="p-min" className="form-input" type="number" inputMode="decimal" value={prodModal.stock_minimo}
                  onChange={e => setProdModal({ ...prodModal, stock_minimo: Number(e.target.value) })} />
              </div>
            </div>
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setProdModal(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={guardarProducto} disabled={saving || !prodModal.codigo_avesoft.trim() || !prodModal.descripcion.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL PROVEEDOR ===================== */}
      {provModal && (
        <div className="modal-overlay" onClick={() => !saving && setProvModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{provModal.id === null ? 'Nuevo proveedor' : 'Editar proveedor'}</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="pr-nombre">Nombre</label>
              <input id="pr-nombre" className="form-input" value={provModal.nombre}
                onChange={e => setProvModal({ ...provModal, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pr-tara">Tara por envase (kg)</label>
              <input id="pr-tara" className="form-input" type="number" inputMode="decimal" value={provModal.peso_tara_kg}
                onChange={e => setProvModal({ ...provModal, peso_tara_kg: Number(e.target.value) })} />
            </div>
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setProvModal(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={guardarProveedor} disabled={saving || !provModal.nombre.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL RECETA ===================== */}
      {recetaModal && (
        <div className="modal-overlay" onClick={() => !saving && setRecetaModal(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{recetaNew ? 'Nueva receta' : 'Editar receta'}</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="r-sistema">Sistema</label>
                <select id="r-sistema" className="form-input" value={recetaModal.nombre_sistema} disabled={!recetaNew}
                  onChange={e => setRecetaModal({ ...recetaModal, nombre_sistema: e.target.value })}>
                  {SISTEMAS.map(s => <option key={s} value={s}>{SISTEMA_LABELS[s]}</option>)}
                </select>
              </div>
              {!recetaNew && (
                <div className="form-group">
                  <label className="form-label" htmlFor="r-activa">Estado</label>
                  <select id="r-activa" className="form-input" value={recetaModal.activa ? '1' : '0'}
                    onChange={e => setRecetaModal({ ...recetaModal, activa: e.target.value === '1' })}>
                    <option value="1">Activa</option>
                    <option value="0">Inactiva</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="r-desc">Descripción</label>
              <input id="r-desc" className="form-input" value={recetaModal.descripcion ?? ''}
                onChange={e => setRecetaModal({ ...recetaModal, descripcion: e.target.value })} />
            </div>

            <label className="form-label">Materiales (consumo por m²)</label>
            {recetaModal.detalle.map((d, i) => (
              <div key={i} className="pesaje-row" style={{ marginBottom: 8 }}>
                <select className="form-input" value={d.producto_id}
                  onChange={e => {
                    const det = [...recetaModal.detalle]; det[i] = { ...det[i], producto_id: e.target.value }
                    setRecetaModal({ ...recetaModal, detalle: det })
                  }}>
                  <option value="">Producto…</option>
                  {productos.map(p => <option key={p.codigo_avesoft} value={p.codigo_avesoft}>{p.codigo_avesoft} · {p.descripcion}</option>)}
                </select>
                <input className="form-input" type="number" inputMode="decimal" style={{ maxWidth: 120 }}
                  placeholder="kg/m²" value={d.cantidad_por_m2 || ''}
                  onChange={e => {
                    const det = [...recetaModal.detalle]; det[i] = { ...det[i], cantidad_por_m2: Number(e.target.value) }
                    setRecetaModal({ ...recetaModal, detalle: det })
                  }} />
                <button className="btn btn--secondary" onClick={() => setRecetaModal({ ...recetaModal, detalle: recetaModal.detalle.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="btn btn--secondary btn--sm" onClick={() => setRecetaModal({ ...recetaModal, detalle: [...recetaModal.detalle, { producto_id: '', cantidad_por_m2: 0 }] })}>
              + Agregar material
            </button>

            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setRecetaModal(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={guardarReceta} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
