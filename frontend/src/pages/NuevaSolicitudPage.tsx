import { useState } from 'react'
import { Header } from '../components/Header'
import { api } from '../services/api'
import type { MaterialCalculado, Page, Producto, Receta, User } from '../types'

interface Props {
  user: User
  recetas: Receta[]
  stock: Producto[]
  onCreated: () => void | Promise<void>
  navigate: (p: Page) => void
  logout: () => void
}

const STEPS = ['Sistema', 'Detalle', 'Confirmar']

const SISTEMA_LABELS: Record<string, string> = {
  mma: 'MMA',
  epoxi: 'Epóxico',
  uretano: 'Uretano',
}

export function NuevaSolicitudPage({ user, recetas, stock, onCreated, navigate, logout }: Props) {
  const [step, setStep] = useState(0)
  const [receta, setReceta] = useState<Receta | null>(null)
  const [obra, setObra] = useState('')
  const [m2, setM2] = useState('')
  const [holgura, setHolgura] = useState('0')

  const [materiales, setMateriales] = useState<MaterialCalculado[]>([])
  const [cubicando, setCubicando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [done, setDone] = useState(false)
  const [solId, setSolId] = useState<number | null>(null)

  const superficie = parseFloat(m2) || 0
  const holguraNum = parseFloat(holgura) || 0

  const getProducto = (codigo: string) => stock.find(p => p.codigo_avesoft === codigo)

  const items = materiales.map(m => {
    const prod = getProducto(m.producto_id)
    return {
      producto_id: m.producto_id,
      nombre: prod?.descripcion ?? m.producto_id,
      unidad: prod?.unidad_medida ?? 'kg',
      total: m.cantidad_neta_kg,
      stockActual: prod?.stock_actual ?? 0,
    }
  })
  const hayStockInsuficiente = items.some(m => m.total > m.stockActual)

  async function irAResumen() {
    if (!receta) return
    setError('')
    setCubicando(true)
    try {
      const mats = await api.cubicar(receta.id, superficie, holguraNum)
      setMateriales(mats)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular la cubicación')
    } finally {
      setCubicando(false)
    }
  }

  async function handleConfirm() {
    if (!receta) return
    setError('')
    setSaving(true)
    try {
      const sol = await api.crearSolicitud({
        obra: obra.trim(),
        m2: superficie,
        sistema_id: receta.id,
        factor_holgura: holguraNum,
        presupuesto_aprobado: true,
      })
      setSolId(sol.id)
      setDone(true)
      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la solicitud')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="app">
        <Header title="Nueva Solicitud" user={user} onBack={() => navigate('dashboard')} onLogout={logout} />
        <div className="page">
          <div className="success-screen">
            <h2 className="success-screen__title">Solicitud creada</h2>
            <p className="success-screen__sub">
              SOL-{String(solId).padStart(3, '0')} ha sido registrada y notificada a bodega.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn--primary btn--full btn--lg" onClick={() => navigate('solicitudes')}>
                Ver solicitudes
              </button>
              <button className="btn btn--secondary btn--full btn--lg" onClick={() => navigate('dashboard')}>
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        title="Nueva Solicitud"
        user={user}
        onBack={() => (step > 0 ? setStep(s => s - 1) : navigate('dashboard'))}
        onLogout={logout}
      />

      <div className="page">
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? 'step--done' : ''} ${i === step ? 'step--active' : ''}`}>
              <div className="step__dot">{i < step ? '✓' : i + 1}</div>
              <div className="step__label">{s}</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert--warning" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Step 0: Sistema de piso */}
        {step === 0 && (
          <>
            <h3 className="section-title">Sistema de piso</h3>
            {recetas.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>
                No hay sistemas configurados.
              </div>
            )}
            {recetas.map(r => (
              <div
                key={r.id}
                className={`sistema-card ${receta?.id === r.id ? 'sistema-card--selected' : ''}`}
                onClick={() => setReceta(r)}
              >
                <div className="sistema-card__name">{SISTEMA_LABELS[r.nombre_sistema] ?? r.nombre_sistema}</div>
                <div className="sistema-card__desc">{r.descripcion}</div>
              </div>
            ))}
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => navigate('dashboard')}>Cancelar</button>
              <button className="btn btn--primary" disabled={!receta} onClick={() => setStep(1)}>
                Siguiente →
              </button>
            </div>
          </>
        )}

        {/* Step 1: Obra + m² + holgura */}
        {step === 1 && receta && (
          <>
            <h3 className="section-title">Detalle del pedido</h3>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card__title">{SISTEMA_LABELS[receta.nombre_sistema] ?? receta.nombre_sistema}</div>
              <div className="card__sub">{receta.descripcion}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de la obra</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ej: Planta Maipú Norte"
                value={obra}
                onChange={e => setObra(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Superficie (m²)</label>
              <input
                className="form-input"
                type="number"
                placeholder="Ej: 150"
                min="1"
                value={m2}
                onChange={e => setM2(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Holgura técnica (% extra, opcional)</label>
              <input
                className="form-input"
                type="number"
                placeholder="0"
                min="0"
                value={holgura}
                onChange={e => setHolgura(e.target.value)}
              />
            </div>
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setStep(0)}>← Atrás</button>
              <button
                className="btn btn--primary"
                disabled={!obra.trim() || superficie <= 0 || cubicando}
                onClick={irAResumen}
              >
                {cubicando ? 'Calculando…' : 'Siguiente →'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Resumen y confirmar */}
        {step === 2 && receta && (
          <>
            <h3 className="section-title">Resumen del pedido</h3>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card__title">{obra}</div>
              <div className="card__sub">
                {SISTEMA_LABELS[receta.nombre_sistema] ?? receta.nombre_sistema} · {superficie} m²
                {holguraNum > 0 ? ` · +${holguraNum}% holgura` : ''}
              </div>
            </div>

            {hayStockInsuficiente && (
              <div className="alert alert--warning">
                Hay materiales con stock insuficiente. Verificar con bodega antes de confirmar.
              </div>
            )}

            <div className="card">
              <div className="card__title" style={{ marginBottom: 14 }}>Materiales calculados</div>
              {items.map(m => {
                const ok = m.total <= m.stockActual
                return (
                  <div key={m.producto_id} className="resumen-item">
                    <div>
                      <div className="resumen-item__name">{m.nombre}</div>
                      <div className="resumen-item__stock">
                        Stock disponible: {m.stockActual} {m.unidad}
                      </div>
                    </div>
                    <div
                      className="resumen-item__amount"
                      style={{ color: ok ? 'var(--slate-900)' : 'var(--red-600)' }}
                    >
                      {m.total} {m.unidad}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setStep(1)} disabled={saving}>← Atrás</button>
              <button className="btn btn--primary" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Creando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
