// Capa de acceso a la API del backend (FastAPI).
import type {
  DespachoPendiente,
  DespachoRow,
  DevolucionAbierta,
  DevolucionRow,
  MaterialCalculado,
  PickingDetail,
  PickingItem,
  PickingRow,
  Producto,
  Receta,
  Rol,
  Solicitud,
  User,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

const TOKEN_KEY = 'grupolc_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    setToken(null)
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface CrearSolicitudPayload {
  obra: string
  m2: number
  sistema_id: number
  factor_holgura: number
  presupuesto_aprobado: boolean
}

export const api = {
  async login(email: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) throw new Error('Credenciales inválidas')
    const data = (await res.json()) as { access_token: string }
    setToken(data.access_token)
  },

  logout() {
    setToken(null)
  },

  me: () => request<User>('/auth/me'),

  listRecetas: () => request<Receta[]>('/recetas'),

  listStock: () => request<Producto[]>('/stock'),

  listSolicitudes: () => request<Solicitud[]>('/solicitudes'),

  cubicar: (sistema_id: number, m2: number, factor_holgura: number) =>
    request<MaterialCalculado[]>('/solicitudes/cubicar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sistema_id, m2, factor_holgura }),
    }),

  crearSolicitud: (payload: CrearSolicitudPayload) =>
    request<Solicitud>('/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // --- Gestión de usuarios (solo admin) ---
  listUsuarios: () => request<User[]>('/usuarios'),

  crearUsuario: (payload: { nombre: string; email: string; password: string; rol: Rol }) =>
    request<User>('/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  actualizarUsuario: (id: string, payload: Partial<{ nombre: string; rol: Rol; activo: boolean; password: string }>) =>
    request<User>(`/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // --- Picking (RF03) ---
  listPicking: () => request<PickingRow[]>('/picking'),

  iniciarPicking: (solicitud_id: number) =>
    request<PickingDetail>('/picking/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitud_id }),
    }),

  getPicking: (pickingId: number) => request<PickingDetail>(`/picking/${pickingId}`),

  pesarItem: (pickingId: number, itemId: number, pesos_bultos: number[]) =>
    request<PickingItem>(`/picking/${pickingId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pesos_bultos }),
    }),

  confirmarPicking: (pickingId: number) =>
    request<PickingDetail>(`/picking/${pickingId}/confirmar`, { method: 'POST' }),

  // --- Despacho (RF04) ---
  listDespachosPendientes: () => request<DespachoPendiente[]>('/despacho/pendientes'),

  listDespachos: () => request<DespachoRow[]>('/despacho'),

  crearDespacho: (picking_id: number, guia_ref: string | null) =>
    request<DespachoRow>('/despacho', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picking_id, guia_ref }),
    }),

  cerrarSinDevolucion: (despachoId: number) =>
    request<DespachoRow>(`/despacho/${despachoId}/cerrar`, { method: 'POST' }),

  // --- Devoluciones (RF05) ---
  listDespachosAbiertos: () => request<DevolucionAbierta[]>('/devoluciones/abiertos'),

  listDevoluciones: () => request<DevolucionRow[]>('/devoluciones'),

  registrarDevolucion: (payload: {
    despacho_id: number
    guia_ref: string | null
    items: { producto_id: string; pesos_bultos: number[] }[]
  }) =>
    request<DevolucionRow>('/devoluciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Descarga autenticada de los CSV batch para Avesoft (P2 / P3).
  async descargarCsv(path: string, filename: string): Promise<void> {
    const token = getToken()
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`No se pudo descargar el archivo (error ${res.status})`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}
