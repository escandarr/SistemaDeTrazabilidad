import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'
import type { Rol, User } from '../types'
import { ROL_LABELS } from '../types'

const ROLES: Rol[] = ['administrador', 'supervisor', 'jefe_bodega', 'operario_bodega']

interface Props {
  currentUserId: string
}

export function UsuariosPage({ currentUserId }: Props) {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('supervisor')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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

  async function crear(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await api.crearUsuario({ nombre, email, password, rol })
      setModal(false)
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('supervisor')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="content-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Usuarios del sistema</h2>
        <button className="btn btn--primary" onClick={() => setModal(true)}>+ Nuevo usuario</button>
      </div>

      {error && <div className="alert alert--warning">{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>Cargando…</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.nombre}
                    {u.id === currentUserId && <span className="tag-you">tú</span>}
                  </td>
                  <td style={{ color: '#64748b' }}>{u.email}</td>
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
                    <span className={`badge ${u.activo ? 'badge--despachada' : 'badge--critical'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--secondary btn--sm"
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

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={crear}>
            <h3 className="modal__title">Nuevo usuario</h3>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-input" value={rol} onChange={e => setRol(e.target.value as Rol)}>
                {ROLES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
              </select>
            </div>
            {formError && <div className="alert alert--warning">{formError}</div>}
            <div className="nav-row">
              <button type="button" className="btn btn--secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
