"""Motor de cubicación (RF02 / 3.1.1).

Traduce superficie (m²) + receta técnica en el desglose neto de materiales en kg.
"""
from dataclasses import dataclass
from typing import Iterable, Protocol


class _DetalleReceta(Protocol):
    producto_id: str
    cantidad_por_m2: float


@dataclass
class MaterialCalculado:
    producto_id: str
    cantidad_neta_kg: float


def calcular_materiales(
    detalle: Iterable[_DetalleReceta],
    m2: float,
    factor_holgura: float = 0.0,
) -> list[MaterialCalculado]:
    """Calcula el material neto requerido por componente.

        cantidad = cantidad_por_m2 * m2 * (1 + factor_holgura / 100)

    `factor_holgura` es el porcentaje extra para obras fuera de la RM (RF02).
    """
    multiplicador = 1 + (float(factor_holgura) / 100)
    return [
        MaterialCalculado(
            producto_id=d.producto_id,
            cantidad_neta_kg=round(float(d.cantidad_por_m2) * float(m2) * multiplicador, 3),
        )
        for d in detalle
    ]
