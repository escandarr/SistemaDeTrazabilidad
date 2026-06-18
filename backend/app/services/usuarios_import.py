"""Parser de la carga masiva de usuarios por CSV (RF01).

Columnas: nombre;email;rol  (separador ';' o ',').
"""
import csv
import io
from dataclasses import dataclass, field

from app.models.enums import RolUsuario

CABECERA = ["nombre", "email", "rol"]
_ROLES_VALIDOS = {r.value for r in RolUsuario}


@dataclass
class FilaUsuario:
    linea: int
    nombre: str
    email: str
    rol: str


@dataclass
class UsuariosParseados:
    filas: list[FilaUsuario] = field(default_factory=list)
    errores: list[str] = field(default_factory=list)


def plantilla_csv() -> str:
    """Plantilla descargable con la cabecera y una fila de ejemplo."""
    return (
        ";".join(CABECERA)
        + "\r\n"
        + "Juan Pérez;juan.perez@grupolc.cl;operario_bodega\r\n"
    )


def parsear_usuarios(contenido: str) -> UsuariosParseados:
    contenido = contenido.lstrip("﻿")
    if not contenido.strip():
        return UsuariosParseados(errores=["El archivo está vacío."])

    primera = contenido.splitlines()[0]
    delim = ";" if primera.count(";") >= primera.count(",") else ","
    filas_raw = list(csv.reader(io.StringIO(contenido), delimiter=delim))

    cabecera = [c.strip().lower() for c in filas_raw[0]]
    idx = {col: cabecera.index(col) for col in CABECERA if col in cabecera}
    if "email" not in idx or "rol" not in idx:
        return UsuariosParseados(errores=["Faltan columnas obligatorias: nombre;email;rol."])

    res = UsuariosParseados()

    def celda(fila: list[str], col: str) -> str:
        pos = idx.get(col)
        return fila[pos].strip() if pos is not None and pos < len(fila) else ""

    for n, fila in enumerate(filas_raw[1:], start=2):
        if not any(c.strip() for c in fila):
            continue
        nombre = celda(fila, "nombre")
        email = celda(fila, "email").lower()
        rol = celda(fila, "rol").lower()
        if not email or "@" not in email:
            res.errores.append(f"Línea {n}: email inválido o vacío.")
            continue
        if rol not in _ROLES_VALIDOS:
            res.errores.append(f"Línea {n}: rol '{rol}' inválido (use: {', '.join(sorted(_ROLES_VALIDOS))}).")
            continue
        if not nombre:
            nombre = email.split("@")[0]
        res.filas.append(FilaUsuario(linea=n, nombre=nombre, email=email, rol=rol))

    return res
