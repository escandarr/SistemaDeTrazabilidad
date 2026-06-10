"""Lógica desacoplada de pesaje y balance de masa (3.1.2 / 3.1.4).

Implementa las ecuaciones (1) y (2) del documento de diseño.
"""
from typing import Protocol


class _Proveedor(Protocol):
    peso_tara_kg: float


class _Producto(Protocol):
    peso_tara_kg: float | None
    proveedor: "_Proveedor | None"


def resolver_tara(producto: _Producto) -> float:
    """Tara efectiva (kg): override del producto o, si es NULL, la del proveedor.

    Refleja el descuento parametrizable por proveedor (RF03):
    Renner −1 kg; otros −2,5 kg.
    """
    if getattr(producto, "peso_tara_kg", None) is not None:
        return float(producto.peso_tara_kg)
    if getattr(producto, "proveedor", None) is not None:
        return float(producto.proveedor.peso_tara_kg)
    return 0.0


def tara_unitaria(producto) -> float:
    """Tara por bulto según cómo se cuenta el producto.

    El material pesado en báscula (kg, l) arrastra el envase; lo contado por
    unidad (brochas, guantes) no lleva tara.
    """
    unidad = getattr(producto, "unidad_medida", None)
    if getattr(unidad, "value", unidad) == "un":
        return 0.0
    return resolver_tara(producto)


def calcular_peso_neto(peso_bruto: float, peso_tara: float) -> float:
    """Ecuación (1): M_neto = M_bruto(báscula) − M_tara(proveedor)."""
    return round(float(peso_bruto) - float(peso_tara), 3)


def consumo_neto_real(despachado_total: float, devuelto_total: float) -> float:
    """Ecuación (2): Consumo Real = Σ M_Despachada − Σ M_Devuelta."""
    return round(float(despachado_total) - float(devuelto_total), 3)
