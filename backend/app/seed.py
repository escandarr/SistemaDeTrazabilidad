"""Siembra de datos demo — preparada para feria / muestra.

Datos realistas calcados de los documentos reales de Grupo LC (guía de despacho
N° 3699, cotización 10563): códigos Avesoft, obra Jumbo La Reina, proveedores con
tara distinta (Renner 1 kg / importadora y cuarzos 2,5 kg), un material bajo
mínimo para disparar la alerta y un equivalente entre proveedores para la
sustitución. Todas las pantallas quedan "vivas" para la demostración.

Uso (dentro del contenedor backend):   python -m app.seed
Para re-sembrar desde cero:            docker compose down -v && up && python -m app.seed
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.catalogo import CentroCosto, Producto, Proveedor, Receta, RecetaDetalle
from app.models.enums import EstadoSolicitud, RolUsuario, SistemaPiso, UnidadMedida
from app.models.operaciones import Solicitud
from app.models.usuario import Usuario

ADMIN_EMAIL = "admin@grupolc.cl"
ADMIN_PASSWORD = "admin1234"

KG = UnidadMedida.KILO
L = UnidadMedida.LITRO
UN = UnidadMedida.UNIDAD


async def _crear_tablas() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _ya_sembrado(db) -> bool:
    result = await db.execute(select(Usuario).where(Usuario.email == ADMIN_EMAIL))
    return result.scalar_one_or_none() is not None


async def seed() -> None:
    await _crear_tablas()

    async with AsyncSessionLocal() as db:
        if await _ya_sembrado(db):
            print("Datos demo ya existen — nada que hacer.")
            print("Para re-sembrar desde cero: docker compose down -v, luego up y python -m app.seed")
            return

        # --- Usuario administrador ---
        admin = Usuario(
            nombre="Benjamín Escandar",
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            rol=RolUsuario.ADMINISTRADOR,
        )

        # --- Proveedores (tara por envase, RF03) ---
        renner = Proveedor(nombre="Renner", peso_tara_kg=1.0)
        duracon = Proveedor(nombre="Importadora Duracon", peso_tara_kg=2.5)
        cuarzos = Proveedor(nombre="Cuarzos del Pacífico", peso_tara_kg=2.5)

        # --- Productos (códigos Avesoft reales de la guía 3699) ---
        # Resinas sistema MMA (marca Duracon)
        resi55 = Producto(codigo_avesoft="RESI55", descripcion="Flowfast Damp Prymer - Duracon 108",
                          unidad_medida=KG, proveedor=duracon, stock_actual=42, stock_minimo=10)
        resi56 = Producto(codigo_avesoft="RESI56", descripcion="Flowfast Std Binder - Duracon 205",
                          unidad_medida=KG, proveedor=duracon, stock_actual=8, stock_minimo=15)   # BAJO MÍNIMO
        resi56r = Producto(codigo_avesoft="RESI56R", descripcion="Rennerdur 420 (equivalente Duracon 205)",
                          unidad_medida=KG, proveedor=renner, stock_actual=60, stock_minimo=15)
        resi62b = Producto(codigo_avesoft="RESI62B", descripcion="Flowfast Catalyst",
                          unidad_medida=KG, proveedor=duracon, stock_actual=26, stock_minimo=5)
        resi10 = Producto(codigo_avesoft="RESI10", descripcion="Rennerdur 526",
                          unidad_medida=KG, proveedor=renner, stock_actual=120, stock_minimo=30)
        resi57 = Producto(codigo_avesoft="RESI57", descripcion="Flowfast Cove Mix - Duracon 208",
                          unidad_medida=KG, proveedor=duracon, stock_actual=33, stock_minimo=10)
        # Cuarzos / áridos
        cuar24b = Producto(codigo_avesoft="CUAR24B", descripcion="Cuarzo Brazil AFI 202",
                          unidad_medida=KG, proveedor=cuarzos, stock_actual=500, stock_minimo=100)
        cuar29 = Producto(codigo_avesoft="CUAR29", descripcion="Cuarzo Natural 14/20",
                          unidad_medida=KG, proveedor=cuarzos, stock_actual=200, stock_minimo=50)
        cuar31 = Producto(codigo_avesoft="CUAR31", descripcion="Cuarzo Natural -70",
                          unidad_medida=KG, proveedor=cuarzos, stock_actual=150, stock_minimo=40)
        # Solventes / consumibles
        diso01a = Producto(codigo_avesoft="DISO01A", descripcion="Disolvente CLO",
                          unidad_medida=L, proveedor=duracon, stock_actual=14, stock_minimo=40)   # BAJO MÍNIMO
        broc02 = Producto(codigo_avesoft="BROC02", descripcion="Brocha Patagón 3/8x2 1/2\"",
                          unidad_medida=UN, proveedor=renner, stock_actual=12, stock_minimo=5)
        eppl01 = Producto(codigo_avesoft="EPPL01", descripcion="Guante PU-Flex Eurogloves",
                          unidad_medida=UN, proveedor=renner, stock_actual=120, stock_minimo=50)
        roll03 = Producto(codigo_avesoft="ROLL03", descripcion="Rodillo Patagón Lana 9\" 23 cm",
                          unidad_medida=UN, proveedor=renner, stock_actual=7, stock_minimo=6)
        cmas04 = Producto(codigo_avesoft="CMAS04", descripcion="Cinta Masking 36 mm x 40 ml",
                          unidad_medida=UN, proveedor=renner, stock_actual=8, stock_minimo=10)    # BAJO MÍNIMO

        # Equivalente entre proveedores (RF07 / 3.G4b):
        # Duracon 205 (bajo stock) ↔ Rennerdur 420.
        resi56.sustituto = resi56r

        productos = [
            resi55, resi56, resi56r, resi62b, resi10, resi57,
            cuar24b, cuar29, cuar31, diso01a, broc02, eppl01, roll03, cmas04,
        ]

        # --- Recetas (sistemas de piso) ---
        receta_mma = Receta(
            nombre_sistema=SistemaPiso.MMA,
            descripcion="MMA Floorfield · espesor 4/5 mm · 3 capas",
            activa=True,
            detalle=[
                RecetaDetalle(producto=resi55, cantidad_por_m2=0.30),
                RecetaDetalle(producto=resi56, cantidad_por_m2=1.50),
                RecetaDetalle(producto=resi62b, cantidad_por_m2=0.10),
                RecetaDetalle(producto=cuar24b, cantidad_por_m2=3.00),
            ],
        )
        receta_epoxi = Receta(
            nombre_sistema=SistemaPiso.EPOXI,
            descripcion="Epóxico industrial · 2 capas · uso general",
            activa=True,
            detalle=[
                RecetaDetalle(producto=resi10, cantidad_por_m2=0.35),
                RecetaDetalle(producto=resi62b, cantidad_por_m2=0.15),
                RecetaDetalle(producto=diso01a, cantidad_por_m2=0.05),
            ],
        )
        receta_uretano = Receta(
            nombre_sistema=SistemaPiso.URETANO,
            descripcion="Uretano antideslizante · con árido · zonas húmedas",
            activa=True,
            detalle=[
                RecetaDetalle(producto=resi57, cantidad_por_m2=0.45),
                RecetaDetalle(producto=resi62b, cantidad_por_m2=0.18),
                RecetaDetalle(producto=cuar29, cantidad_por_m2=0.30),
            ],
        )

        # --- Centros de costo (obras reales) ---
        cc_jumbo = CentroCosto(codigo="CC-10563", nombre_obra="Jumbo La Reina - Rincón Jumbo",
                               cliente_identificador="Cencosud Retail S.A.")
        cc_maipu = CentroCosto(codigo="CC-10570", nombre_obra="Planta Maipú Norte",
                               cliente_identificador="Alimentos Maipú SpA")
        cc_pudahuel = CentroCosto(codigo="CC-10588", nombre_obra="Bodega Pudahuel",
                                  cliente_identificador="Logística PudahuelLtda.")

        db.add_all([admin, renner, duracon, cuarzos, *productos,
                    receta_mma, receta_epoxi, receta_uretano,
                    cc_jumbo, cc_maipu, cc_pudahuel])
        await db.flush()  # genera ids (admin.id, receta.id, etc.)

        ahora = datetime.now(timezone.utc)
        solicitudes = [
            # Lista para demostrar picking en vivo (Caso 1).
            Solicitud(supervisor_id=admin.id, centro_costo_id=cc_jumbo.codigo, m2=12,
                      sistema_id=receta_mma.id, factor_holgura=10, presupuesto_aprobado=True,
                      estado=EstadoSolicitud.ENVIADA, creado_at=ahora - timedelta(hours=2)),
            Solicitud(supervisor_id=admin.id, centro_costo_id=cc_maipu.codigo, m2=150,
                      sistema_id=receta_epoxi.id, factor_holgura=5, presupuesto_aprobado=True,
                      estado=EstadoSolicitud.ENVIADA, creado_at=ahora - timedelta(days=1)),
            Solicitud(supervisor_id=admin.id, centro_costo_id=cc_pudahuel.codigo, m2=80,
                      sistema_id=receta_uretano.id, factor_holgura=0, presupuesto_aprobado=False,
                      estado=EstadoSolicitud.BORRADOR, creado_at=ahora - timedelta(days=2)),
            # Historial cerrado (para que el inicio muestre actividad).
            Solicitud(supervisor_id=admin.id, centro_costo_id=cc_jumbo.codigo, m2=60,
                      sistema_id=receta_mma.id, factor_holgura=10, presupuesto_aprobado=True,
                      estado=EstadoSolicitud.CERRADA, creado_at=ahora - timedelta(days=9)),
        ]
        db.add_all(solicitudes)
        await db.commit()

        print("=" * 60)
        print("SEED DEMO (feria) completado.")
        print(f"  Login admin:  {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"  Productos: {len(productos)} | Recetas: 3 | Obras: 3 | Solicitudes: {len(solicitudes)}")
        print("  Alertas de stock (bajo mínimo): RESI56, DISO01A, CMAS04")
        print("  Sustitución: RESI56 (Duracon 205) -> RESI56R (Rennerdur 420)")
        print("  Para Caso 1 (picking en vivo): solicitud ENVIADA de 'Jumbo La Reina', MMA 12 m²")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
