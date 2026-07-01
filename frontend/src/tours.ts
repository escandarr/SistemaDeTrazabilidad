import type { Page } from './types'

// Un paso del walkthrough. `page` navega antes de resaltar; `anchor` apunta a un
// elemento con [data-tour="..."]; sin anchor, el globo se muestra centrado.
export interface TourStep {
  page?: Page
  anchor?: string
  title: string
  body: string
}

export interface Tutorial {
  id: string
  numero: string
  titulo: string
  resumen: string
  steps: TourStep[]
}

export const BIENVENIDA: Tutorial = {
  id: 'bienvenida',
  numero: 'Bienvenida',
  titulo: 'Recorrido general',
  resumen: 'Un vistazo rápido a todo el sistema en menos de un minuto. Ideal para empezar.',
  steps: [
    {
      title: '¡Bienvenido a Grupo LC · Trazabilidad!',
      body: 'En menos de un minuto te muestro todo lo que puedes hacer aquí. Puedes cerrar en cualquier momento con la ✕.',
    },
    {
      page: 'dashboard', anchor: 'dash-metrics',
      title: 'El Inicio',
      body: 'Tu tablero del día: solicitudes, pendientes, alertas de stock y productos en inventario.',
    },
    {
      anchor: 'nav-solicitudes',
      title: 'Solicitudes',
      body: 'Creas y sigues los pedidos de material. El sistema calcula solo cuánto se necesita por m² (cubicación).',
    },
    {
      anchor: 'nav-picking',
      title: 'Bodega',
      body: 'Preparas el pedido pesando (Picking), lo despachas con guía para Avesoft y registras las devoluciones.',
    },
    {
      anchor: 'nav-materiales',
      title: 'Administración',
      body: 'Gestionas el catálogo de materiales, los proveedores, las recetas y los usuarios con sus roles.',
    },
    {
      anchor: 'nav-tutoriales',
      title: 'Tutoriales',
      body: 'Aquí puedes repetir el recorrido de cada caso paso a paso cuando quieras. ¡Explora con confianza!',
    },
  ],
}

export const TUTORIALES: Tutorial[] = [
  {
    id: 'caso1',
    numero: 'Caso 1',
    titulo: 'Del pedido al consumo real',
    resumen: 'El ciclo completo de una obra: solicitud, picking con pesaje, despacho y devolución con consumo real.',
    steps: [
      {
        page: 'dashboard', anchor: 'dash-metrics',
        title: 'El tablero',
        body: 'Aquí ves de un vistazo las solicitudes, las pendientes, las alertas de stock y los productos del inventario.',
      },
      {
        page: 'nueva-solicitud', anchor: 'ns-panel',
        title: '1. Nueva solicitud',
        body: 'Eliges el sistema de piso, la obra y los m². El sistema calcula los materiales automáticamente (cubicación) aplicando la holgura técnica.',
      },
      {
        page: 'picking', anchor: 'picking-content',
        title: '2. Picking con pesaje',
        body: 'Bodega prepara el pedido: se pesa por bulto y el sistema resta la tara del proveedor. Neto = bruto − tara, sin cálculos a mano.',
      },
      {
        page: 'despacho', anchor: 'nav-despacho',
        title: '3. Despacho',
        body: 'Al despachar se descuenta el stock por el peso real y se genera el CSV para importar en Avesoft.',
      },
      {
        page: 'devoluciones', anchor: 'nav-devoluciones',
        title: '4. Devolución y consumo real',
        body: 'Lo que vuelve de obra se pesa y reingresa al inventario. Aquí se calcula el consumo real = despachado − devuelto.',
      },
      {
        title: '¡Ciclo completo!',
        body: 'Esa es la trazabilidad de punta a punta: solicitud → picking → despacho → devolución, con el consumo real de cada obra.',
      },
    ],
  },
  {
    id: 'caso2',
    numero: 'Caso 2',
    titulo: 'Quiebre de stock y equivalente',
    resumen: 'Alertas automáticas de stock bajo y sustitución por el equivalente de otro proveedor.',
    steps: [
      {
        page: 'stock', anchor: 'stock-content',
        title: 'Inventario y alertas',
        body: 'Los materiales bajo el mínimo aparecen en rojo. La misma alerta se muestra en el Inicio para que nunca te pille por sorpresa.',
      },
      {
        page: 'picking', anchor: 'picking-content',
        title: 'Sustitución en el picking',
        body: 'Al preparar un pedido, si un material no alcanza, el sistema sugiere el equivalente de otro proveedor con su stock y lo cambias con un botón.',
      },
      {
        title: 'Sin obra detenida',
        body: 'La alerta salta sola y el reemplazo ya viene sugerido. Cero improvisación entre proveedores.',
      },
    ],
  },
  {
    id: 'caso3',
    numero: 'Caso 3',
    titulo: 'Equipo e invitaciones',
    resumen: 'Alta de usuarios por enlace, contraseñas seguras que crea cada persona y acceso por rol.',
    steps: [
      {
        page: 'usuarios', anchor: 'user-toolbar',
        title: 'Invitar al equipo',
        body: 'Invitas por un enlace o cargas un CSV con todo el equipo de una vez. Tú no fijas la contraseña.',
      },
      {
        page: 'usuarios', anchor: 'user-toolbar',
        title: 'Cada uno crea su clave',
        body: 'La persona abre el enlace y define su propia contraseña, con un medidor de seguridad que exige mayúscula, número y símbolo.',
      },
      {
        title: 'Acceso por rol',
        body: 'Cada rol (supervisor, bodega, jefe, admin) ve solo lo que le corresponde. Onboarding en segundos y con control.',
      },
    ],
  },
  {
    id: 'caso4',
    numero: 'Caso 4',
    titulo: 'Integración con Avesoft',
    resumen: 'Importar y exportar por CSV, sin API: catálogo, salidas de despacho y reingresos de devolución.',
    steps: [
      {
        page: 'materiales', anchor: 'mat-toolbar',
        title: 'Catálogo maestro',
        body: 'Productos, proveedores y recetas. Importas el maestro de Avesoft por CSV y exportas el catálogo o el inventario cuando quieras.',
      },
      {
        page: 'despacho', anchor: 'nav-despacho',
        title: 'CSV de salidas',
        body: 'Cada despacho genera el archivo de consumos por centro de costo, listo para Avesoft.',
      },
      {
        page: 'devoluciones', anchor: 'nav-devoluciones',
        title: 'CSV de reingresos',
        body: 'Cada devolución genera el archivo de reingreso. Así se cierra el circuito con Avesoft sin doble digitación.',
      },
      {
        title: 'Avesoft sin API',
        body: 'Conectamos ambos sistemas por archivo, que es como Avesoft trabaja de verdad.',
      },
    ],
  },
]

// Lista completa para la página de Tutoriales y para buscar por id.
export const TODOS: Tutorial[] = [BIENVENIDA, ...TUTORIALES]
