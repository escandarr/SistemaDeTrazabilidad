export type Role = 'supervisor' | 'jefe_bodega' | 'operario'
export type EstadoSolicitud = 'pendiente' | 'en_picking' | 'despachado'
export type Page = 'dashboard' | 'solicitudes' | 'nueva-solicitud' | 'stock'

export interface User {
  id: number
  nombre: string
  rol: Role
}

export interface Material {
  id: string
  nombre: string
  unidad: string
}

export interface RecetaItem {
  materialId: string
  cantidad: number // kg por m²
}

export interface SistemaPiso {
  id: string
  nombre: string
  descripcion: string
  receta: RecetaItem[]
}

export interface StockItem {
  materialId: string
  cantidad: number
  minimo: number
}

export interface Solicitud {
  id: string
  obra: string
  sistema: string
  m2: number
  estado: EstadoSolicitud
  fecha: string
}

export const USERS: User[] = [
  { id: 1, nombre: 'Carlos Muñoz', rol: 'supervisor' },
  { id: 2, nombre: 'Alejandro López', rol: 'jefe_bodega' },
  { id: 3, nombre: 'Pedro Soto', rol: 'operario' },
]

export const MATERIALES: Material[] = [
  { id: 'resina-epox', nombre: 'Resina Epóxica', unidad: 'kg' },
  { id: 'catalizador', nombre: 'Catalizador B', unidad: 'kg' },
  { id: 'diluyente', nombre: 'Diluyente C', unidad: 'kg' },
  { id: 'arido', nombre: 'Árido Silíceo', unidad: 'kg' },
  { id: 'resina-pu', nombre: 'Resina Poliuretano', unidad: 'kg' },
  { id: 'pigmento', nombre: 'Pigmento Gris', unidad: 'kg' },
]

export const SISTEMAS: SistemaPiso[] = [
  {
    id: 'epox-std',
    nombre: 'Epóxico Estándar',
    descripcion: '2 capas · liso · uso industrial general',
    receta: [
      { materialId: 'resina-epox', cantidad: 0.35 },
      { materialId: 'catalizador', cantidad: 0.15 },
      { materialId: 'diluyente', cantidad: 0.05 },
    ],
  },
  {
    id: 'pu-antidesliz',
    nombre: 'Poliuretano Antideslizante',
    descripcion: 'Con árido · zonas húmedas · tráfico pesado',
    receta: [
      { materialId: 'resina-pu', cantidad: 0.45 },
      { materialId: 'catalizador', cantidad: 0.18 },
      { materialId: 'arido', cantidad: 0.30 },
    ],
  },
  {
    id: 'epox-ar',
    nombre: 'Epóxico Alta Resistencia',
    descripcion: '3 capas · alta abrasión · zonas críticas',
    receta: [
      { materialId: 'resina-epox', cantidad: 0.50 },
      { materialId: 'catalizador', cantidad: 0.20 },
      { materialId: 'diluyente', cantidad: 0.08 },
      { materialId: 'pigmento', cantidad: 0.02 },
    ],
  },
]

export const STOCK_INICIAL: StockItem[] = [
  { materialId: 'resina-epox', cantidad: 245, minimo: 100 },
  { materialId: 'catalizador', cantidad: 87, minimo: 50 },
  { materialId: 'diluyente', cantidad: 23, minimo: 40 },
  { materialId: 'arido', cantidad: 540, minimo: 200 },
  { materialId: 'resina-pu', cantidad: 65, minimo: 80 },
  { materialId: 'pigmento', cantidad: 12, minimo: 10 },
]

export const SOLICITUDES_INICIAL: Solicitud[] = [
  { id: 'SOL-001', obra: 'Bodega Pudahuel Norte', sistema: 'Epóxico Estándar', m2: 120, estado: 'en_picking', fecha: '2026-05-22' },
  { id: 'SOL-002', obra: 'Planta Maipú Industrial', sistema: 'Poliuretano Antideslizante', m2: 80, estado: 'despachado', fecha: '2026-05-20' },
  { id: 'SOL-003', obra: 'Frigorífico Stgo Centro', sistema: 'Epóxico Alta Resistencia', m2: 200, estado: 'pendiente', fecha: '2026-05-24' },
]
