"""Siembra de datos demo para levantar una demo viva rápidamente.

Crea las tablas (si no existen) e inserta un conjunto mínimo coherente con el
documento de diseño: un administrador, los dos proveedores con sus taras,
productos con sustituto, una receta MMA con su detalle y un centro de costo.

Uso (dentro del contenedor backend):
    python -m app.seed
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.catalogo import CentroCosto, Producto, Proveedor, Receta, RecetaDetalle
from app.models.enums import RolUsuario, SistemaPiso, UnidadMedida
from app.models.usuario import Usuario

ADMIN_EMAIL = "admin@grupolc.cl"
ADMIN_PASSWORD = "admin1234"


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
            return

        # Usuario administrador
        admin = Usuario(
            nombre="Administrador Demo",
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            rol=RolUsuario.ADMINISTRADOR,
        )

        # Proveedores con tara por envase (RF03)
        renner = Proveedor(nombre="Renner", peso_tara_kg=1.0)
        otro = Proveedor(nombre="Proveedor B", peso_tara_kg=2.5)

        # Productos — el 304 es sustituto técnico del 526 (RF07)
        prod_526 = Producto(
            codigo_avesoft="526",
            descripcion="Resina MMA base",
            unidad_medida=UnidadMedida.KILO,
            proveedor=renner,
            stock_actual=120,
            stock_minimo=30,
        )
        prod_304 = Producto(
            codigo_avesoft="304",
            descripcion="Resina MMA base (equivalente)",
            unidad_medida=UnidadMedida.KILO,
            proveedor=otro,
            stock_actual=80,
            stock_minimo=20,
        )
        prod_pigmento = Producto(
            codigo_avesoft="PIG-RED",
            descripcion="Pigmento rojo",
            unidad_medida=UnidadMedida.KILO,
            proveedor=renner,
            stock_actual=40,
            stock_minimo=10,
        )
        prod_526.sustituto = prod_304

        # Receta MMA con consumo por m²
        receta_mma = Receta(
            nombre_sistema=SistemaPiso.MMA,
            descripcion="Sistema MMA estándar (3 capas)",
            activa=True,
            detalle=[
                RecetaDetalle(producto=prod_526, cantidad_por_m2=1.5),
                RecetaDetalle(producto=prod_pigmento, cantidad_por_m2=0.2),
            ],
        )

        centro = CentroCosto(
            codigo="OBRA-001",
            nombre_obra="Jumbo La Reina",
            cliente_identificador="Cencosud",
        )

        db.add_all([admin, renner, otro, prod_526, prod_304, prod_pigmento, receta_mma, centro])
        await db.commit()

        print("Seed completado.")
        print(f"  Login admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"  Receta MMA id: {receta_mma.id}  |  Centro de costo: {centro.codigo}")


if __name__ == "__main__":
    asyncio.run(seed())
