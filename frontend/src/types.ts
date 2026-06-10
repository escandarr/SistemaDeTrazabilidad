// Tipos alineados con el backend (FastAPI / Grupo LC).

export type Rol = 'administrador' | 'supervisor' | 'operario_bodega' | 'jefe_bodega'

export type EstadoSolicitud = 'borrador' | 'enviada' | 'en_picking' | 'despachada' | 'cerrada'

export type Page =
  | 'dashboard'
  | 'solicitudes'
  | 'nueva-solicitud'
  | 'stock'
  | 'usuarios'
  | 'picking'
  | 'despacho'
  | 'devoluciones'

export type EstadoPicking = 'pendiente' | 'confirmado' | 'rechazado'

export interface User {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
}

export interface Receta {
  id: number
  nombre_sistema: string // mma | uretano | epoxi
  descripcion: string | null
}

export interface Producto {
  codigo_avesoft: string
  descripcion: string
  unidad_medida: string
  proveedor_id: number | null
  peso_tara_kg: number | null
  stock_actual: number
  stock_minimo: number
  sustituto_id: string | null
}

export interface Solicitud {
  id: number
  obra: string
  sistema: string
  m2: number
  estado: EstadoSolicitud
  creado_at: string
}

export interface MaterialCalculado {
  producto_id: string
  cantidad_neta_kg: number
}

// --- Picking (RF03) ---

export interface PickingRow {
  solicitud_id: number
  picking_id: number | null
  obra: string
  sistema: string
  m2: number
  estado_solicitud: EstadoSolicitud
  estado_picking: EstadoPicking | null
}

export interface PickingItem {
  id: number
  producto_id: string
  descripcion: string
  unidad: string
  cantidad_teorica: number | null
  tara_unitaria: number
  peso_bruto: number | null
  peso_tara: number | null
  peso_neto: number | null
}

export interface PickingDetail {
  id: number
  solicitud_id: number
  obra: string
  sistema: string
  estado: EstadoPicking
  items: PickingItem[]
}

// --- Despacho (RF04) ---

export interface DespachoItem {
  producto_id: string
  descripcion: string
  unidad: string
  peso_neto: number
}

export interface DespachoPendiente {
  picking_id: number
  solicitud_id: number
  obra: string
  sistema: string
  total_neto_kg: number
  items: DespachoItem[]
}

export interface DespachoRow {
  id: number
  solicitud_id: number
  obra: string
  sistema: string
  fecha: string | null
  total_neto_kg: number
  guia_avesoft_ref: string | null
  estado_solicitud: EstadoSolicitud
  tiene_devolucion: boolean
}

// --- Devoluciones (RF05) ---

export interface DevolucionAbiertaItem {
  producto_id: string
  descripcion: string
  unidad: string
  despachado_kg: number
  tara_unitaria: number
}

export interface DevolucionAbierta {
  despacho_id: number
  solicitud_id: number
  obra: string
  fecha_despacho: string | null
  items: DevolucionAbiertaItem[]
}

export interface DevolucionRow {
  id: number
  despacho_id: number
  solicitud_id: number
  obra: string
  fecha: string
  total_devuelto_kg: number
  consumo_real_kg: number
}

export const ROL_LABELS: Record<Rol, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  operario_bodega: 'Operario de Bodega',
  jefe_bodega: 'Jefe de Bodega',
}

export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_picking: 'En Picking',
  despachada: 'Despachada',
  cerrada: 'Cerrada',
}
