import { useState } from 'react'

interface Props {
  unidad: string
  taraUnitaria: number
  disabled?: boolean
  /** Modo acumulador: notifica las pesadas al padre (devoluciones). */
  onChange?: (pesos: number[]) => void
  /** Modo guardado directo: persiste las pesadas (picking). */
  onSave?: (pesos: number[]) => Promise<void>
  saveLabel?: string
}

/**
 * Réplica digital de la hoja de pesaje de bodega: una pesada por bulto,
 * el sistema suma y descuenta la tara (M_neto = Σ M_bruto − tara × bultos).
 */
export function PesajeEditor({ unidad, taraUnitaria, disabled, onChange, onSave, saveLabel = 'Guardar pesaje' }: Props) {
  const [pesos, setPesos] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [saving, setSaving] = useState(false)

  const esContado = unidad === 'un'
  const bruto = pesos.reduce((a, b) => a + b, 0)
  const tara = esContado ? 0 : taraUnitaria * pesos.length
  const neto = Math.round((bruto - tara) * 1000) / 1000

  function update(next: number[]) {
    setPesos(next)
    onChange?.(next)
  }

  function agregar() {
    const v = parseFloat(valor)
    if (!v || v <= 0) return
    update([...pesos, v])
    setValor('')
  }

  function quitar(idx: number) {
    update(pesos.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!onSave || pesos.length === 0) return
    setSaving(true)
    try {
      await onSave(pesos)
      update([])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="pesaje-row">
        <input
          className="form-input"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder={esContado ? 'Cantidad' : `Peso bulto (${unidad})`}
          aria-label={esContado ? 'Cantidad' : `Peso por bulto en ${unidad}`}
          value={valor}
          disabled={disabled || saving}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
        />
        <button type="button" className="btn btn--secondary" onClick={agregar} disabled={disabled || saving || !valor}>
          Agregar
        </button>
        {onSave && (
          <button type="button" className="btn btn--primary" onClick={guardar} disabled={disabled || saving || pesos.length === 0}>
            {saving ? 'Guardando…' : saveLabel}
          </button>
        )}
      </div>

      {pesos.length > 0 && (
        <>
          <div className="chips">
            {pesos.map((p, i) => (
              <span key={`${p}-${i}`} className="chip">
                {p} {esContado ? 'un' : unidad}
                <button type="button" aria-label={`Quitar pesada ${p}`} onClick={() => quitar(i)} disabled={disabled || saving}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="pesaje-total">
            <span>Bruto <strong>{bruto.toFixed(esContado ? 0 : 2)}</strong></span>
            {!esContado && <span>Tara <strong>−{tara.toFixed(2)}</strong> ({pesos.length} × {taraUnitaria} kg)</span>}
            <span>Neto <strong>{neto.toFixed(esContado ? 0 : 2)} {unidad}</strong></span>
          </div>
        </>
      )}
    </div>
  )
}
