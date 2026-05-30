import { useState } from 'react'
import { Header } from '../components/Header'
import { User, Solicitud, StockItem, SistemaPiso, Page, SISTEMAS, MATERIALES } from '../mock'

interface Props {
  user: User
  stock: StockItem[]
  setStock: (s: StockItem[]) => void
  onConfirm: (s: Solicitud) => void
  navigate: (p: Page) => void
  logout: () => void
}

const STEPS = ['Sistema', 'Detalle', 'Confirmar']

function getMaterialNombre(id: string) {
  return MATERIALES.find(m => m.id === id)?.nombre ?? id
}

export function NuevaSolicitudPage({ user, stock, setStock, onConfirm, navigate, logout }: Props) {
  const [step, setStep] = useState(0)
  const [sistema, setSistema] = useState<SistemaPiso | null>(null)
  const [obra, setObra] = useState('')
  const [m2, setM2] = useState('')
  const [done, setDone] = useState(false)
  const [solId, setSolId] = useState('')

  const superficie = parseFloat(m2) || 0

  const getStockActual = (materialId: string) =>
    stock.find(s => s.materialId === materialId)?.cantidad ?? 0

  const materiales = sistema && superficie > 0
    ? sistema.receta.map(r => ({
        materialId: r.materialId,
        nombre: getMaterialNombre(r.materialId),
        total: +(r.cantidad * superficie).toFixed(1),
        stockActual: getStockActual(r.materialId),
      }))
    : []

  const hayStockInsuficiente = materiales.some(m => m.total > m.stockActual)

  function handleConfirm() {
    const id = `SOL-${String(Math.floor(Math.random() * 900) + 100)}`
    setSolId(id)

    const newStock = stock.map(s => {
      const uso = materiales.find(m => m.materialId === s.materialId)
      if (uso) return { ...s, cantidad: +(s.cantidad - uso.total).toFixed(1) }
      return s
    })
    setStock(newStock)

    onConfirm({
      id,
      obra,
      sistema: sistema!.nombre,
      m2: superficie,
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0],
    })
    setDone(true)
  }

  if (done) {
    return (
      <div className="app">
        <Header title="Nueva Solicitud" user={user} onBack={() => navigate('dashboard')} onLogout={logout} />
        <div className="page">
          <div className="success-screen">
            <div className="success-screen__icon">✅</div>
            <h2 className="success-screen__title">Solicitud creada</h2>
            <p className="success-screen__sub">{solId} ha sido registrada y notificada a bodega.</p>
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
        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? 'step--done' : ''} ${i === step ? 'step--active' : ''}`}>
              <div className="step__dot">{i < step ? '✓' : i + 1}</div>
              <div className="step__label">{s}</div>
            </div>
          ))}
        </div>

        {/* Step 0: Sistema de piso */}
        {step === 0 && (
          <>
            <h3 className="section-title">Sistema de piso</h3>
            {SISTEMAS.map(s => (
              <div
                key={s.id}
                className={`sistema-card ${sistema?.id === s.id ? 'sistema-card--selected' : ''}`}
                onClick={() => setSistema(s)}
              >
                <div className="sistema-card__name">{s.nombre}</div>
                <div className="sistema-card__desc">{s.descripcion}</div>
              </div>
            ))}
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => navigate('dashboard')}>Cancelar</button>
              <button className="btn btn--primary" disabled={!sistema} onClick={() => setStep(1)}>
                Siguiente →
              </button>
            </div>
          </>
        )}

        {/* Step 1: Obra + m² */}
        {step === 1 && (
          <>
            <h3 className="section-title">Detalle del pedido</h3>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card__title">{sistema?.nombre}</div>
              <div className="card__sub">{sistema?.descripcion}</div>
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
            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setStep(0)}>← Atrás</button>
              <button
                className="btn btn--primary"
                disabled={!obra.trim() || superficie <= 0}
                onClick={() => setStep(2)}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Resumen y confirmar */}
        {step === 2 && (
          <>
            <h3 className="section-title">Resumen del pedido</h3>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card__title">{obra}</div>
              <div className="card__sub">{sistema?.nombre} · {superficie} m²</div>
            </div>

            {hayStockInsuficiente && (
              <div className="alert alert--warning">
                ⚠️ Hay materiales con stock insuficiente. Verificar con bodega antes de confirmar.
              </div>
            )}

            <div className="card">
              <div className="card__title" style={{ marginBottom: 14 }}>Materiales calculados</div>
              {materiales.map(m => {
                const ok = m.total <= m.stockActual
                return (
                  <div key={m.materialId} className="resumen-item">
                    <div>
                      <div className="resumen-item__name">{m.nombre}</div>
                      <div className="resumen-item__stock">
                        Stock disponible: {m.stockActual} kg {!ok ? '⚠️' : ''}
                      </div>
                    </div>
                    <div
                      className="resumen-item__amount"
                      style={{ color: ok ? 'var(--slate-900)' : 'var(--red-600)' }}
                    >
                      {m.total} kg
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="nav-row">
              <button className="btn btn--secondary" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn btn--primary" onClick={handleConfirm}>
                Confirmar ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
