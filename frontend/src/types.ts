// Tipos alineados con el backend (FastAPI / Grupo LC).

export type Rol = 'administrador' | 'supervisor' | 'operario_bodega' | 'jefe_bodega'

export type EstadoSolicitud = 'borrador' | 'enviada' | 'en_picking' | 'despachada' | 'cerrada'

export type Page = 'dashboard' | 'solicitudes' | 'nueva-solicitud' | 'stock'

export interface User {
  id: string
  nombre: string
  email: string
  rol: Rol
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
