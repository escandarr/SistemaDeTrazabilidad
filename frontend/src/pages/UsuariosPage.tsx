import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'
import type { BulkInvitacionResult, InvitacionCreada, Rol, User } from '../types'
import { ROL_LABELS } from '../types'
import { CopyIcon } from '../components/icons'

const ROLES: Rol[] = ['administrador', 'supervisor', 'jefe_bodega', 'operario_bodega']

function inviteLink(token: string): string {
  return `${window.location.origin}/aceptar-invitacion?token=${token}`
}

interface Props {
  currentUserId: string
}

export function UsuariosPage({ currentUserId }: Props) {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modal, setModal] = useState<'nuevo' | 'bulk' | null>(null)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Rol>('supervisor')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [invite, setInvite] = useState<InvitacionCreada | null>(null)
  const [bulk, setBulk] = useState<BulkInvitacionResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setError('')
    try {
      setUsuarios(await api.listUsuarios())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function copiar(texto: string, key: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopied(key)
      setTimeout(() => setCopied(c => (c === key ? null : c)), 1500)
    } catch {
      setError('No se pudo copiar al portapapeles.')
    }
  }

  async function cambiarRol(u: User, nuevo: Rol) {
    try {
      const upd = await api.actualizarUsuario(u.id, { rol: nuevo })
      setUsuarios(prev => prev.map(x => (x.id === u.id ? upd : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el rol')
    }
  }

  async function toggleActivo(u: User) {
    try {
      const upd = await api.actualizarUsuario(u.id, { activo: !u.activo })
      setUsuarios(prev => prev.map(x => (x.id === u.id ? upd : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
    }
  }

  function abrirNuevo() {
    setNombre('')
    setEmail('')
    setRol('supervisor')
    setFormError('')
    setInvite(null)
    setModal('nuevo')
  }

  async function invitar(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const res = await api.invitarUsuario({ nombre, email, rol })
      setInvite(res)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo invitar al usuario')
    } finally {
      setSaving(false)
    }
  }

  async function reenviar(u: User) {
    setError('')
    try {
      const res = await api.invitarUsuario({ nombre: u.nombre, email: u.email, rol: u.rol })
      setInvite(res)
      setModal('nuevo')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reenviar la invitación')
    }
  }

  async function descargarPlantilla() {
    setError('')
    try {
      await api.descargarCsv('/usuarios/plantilla', 'plantilla_usuarios.csv')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar la plantilla')
    }
  }

  async function onBulkFile(file: File) {
    setError('')
    setSaving(true)
    try {
      const res = await api.invitarBulk(file)
      setBulk(res)
      setModal('bulk')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el archivo')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <div className="content-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Usuarios del sistema</h2>
        <div className="toolbar">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && onBulkFile(e.target.files[0])}
          />
          <button className="btn btn--secondary btn--sm" onClick={descargarPlantilla}>
            Plantilla CSV
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()} disabled={saving}>
            Cargar CSV
          </button>
          <button className="btn btn--primary btn--sm" onClick={abrirNuevo}>Nuevo usuario</button>
        </div>
      </div>

      {error && <div className="alert alert--warning">{error}</div>}

      {loading ? (
        <div className="empty">Cargando usuarios…</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.nombre}
                    {u.id === currentUserId && <span className="tag-you">tú</span>}
                  </td>
                  <td className="td--muted">{u.email}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.rol}
                      disabled={u.id === currentUserId}
                      onChange={e => cambiarRol(u, e.target.value as Rol)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge--despachada' : 'badge--pendiente'}`}>
                      {u.activo ? 'Activo' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!u.activo && (
                      <button className="btn btn--secondary btn--sm" onClick={() => reenviar(u)}>
                        Reenviar invitación
                      </button>
                    )}
                    <button
                      className="btn btn--secondary btn--sm"
                      style={{ marginLeft: 6 }}
                      disabled={u.id === currentUserId}
                      onClick={() => toggleActivo(u)}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Modal nuevo usuario / invitación ===== */}
      {modal === 'nuevo' && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {invite ? (
              <>
                <h3 className="modal__title">Invitación lista</h3>
                <p style={{ fontSize: 14, color: 'var(--gris-600)', marginBottom: 14 }}>
                  Comparte este enlace con <strong>{invite.email}</strong>. Al abrirlo creará su contraseña y activará su cuenta.
                </p>
                <div className="invite-link">
                  <input className="form-input" readOnly value={inviteLink(invite.token)} onFocus={e => e.target.select()} />
                  <button className="btn btn--primary" onClick={() => copiar(inviteLink(invite.token), 'single')}>
                    <CopyIcon size={16} /> {copied === 'single' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="td--sub" style={{ marginTop: 8 }}>El enlace vence en 7 días.</p>
                <div className="nav-row">
                  <button className="btn btn--secondary" onClick={abrirNuevo}>Invitar otro</button>
                  <button className="btn btn--primary" onClick={() => setModal(null)}>Listo</button>
                </div>
              </>
            ) : (
              <form onSubmit={invitar}>
                <h3 className="modal__title">Nuevo usuario</h3>
                <p style={{ fontSize: 13, color: 'var(--gris-600)', marginBottom: 16 }}>
                  El usuario recibirá un enlace para crear su propia contraseña.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="nu-nombre">Nombre</label>
                  <input id="nu-nombre" className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="nu-email">Email</label>
                  <input id="nu-email" className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="nu-rol">Rol</label>
                  <select id="nu-rol" className="form-input" value={rol} onChange={e => setRol(e.target.value as Rol)}>
                    {ROLES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
                  </select>
                </div>
                {formError && <div className="alert alert--warning">{formError}</div>}
                <div className="nav-row">
                  <button type="button" className="btn btn--secondary" onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
                  <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Generando…' : 'Generar invitación'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal resultado carga CSV ===== */}
      {modal === 'bulk' && bulk && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">Carga masiva</h3>
            <p style={{ fontSize: 14, color: 'var(--gris-600)', marginBottom: 14 }}>
              {bulk.invitados.length} invitación(es) generada(s) de {bulk.total_filas} fila(s).
              Comparte cada enlace con su destinatario.
            </p>

            {bulk.invitados.length > 0 && (
              <div className="invite-list">
                {bulk.invitados.map(i => (
                  <div key={i.email} className="invite-list__row">
                    <div className="invite-list__who">
                      <strong>{i.nombre}</strong>
                      <span className="td--muted">{i.email}</span>
                    </div>
                    <button className="btn btn--secondary btn--sm" onClick={() => copiar(inviteLink(i.token), i.email)}>
                      <CopyIcon size={15} /> {copied === i.email ? 'Copiado' : 'Copiar link'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {bulk.errores.length > 0 && (
              <div className="alert alert--warning" style={{ marginTop: 14 }}>
                <strong>{bulk.errores.length} fila(s) con problemas:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {bulk.errores.slice(0, 10).map((er, i) => <li key={i}>{er}</li>)}
                  {bulk.errores.length > 10 && <li>… y {bulk.errores.length - 10} más</li>}
                </ul>
              </div>
            )}

            <div className="nav-row">
              <button className="btn btn--primary" onClick={() => setModal(null)}>Listo</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
