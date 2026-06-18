import re
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Política de contraseña (RF01): alta entropía mínima exigible.
PASSWORD_MIN_LEN = 8
_REGLAS = [
    (lambda p: len(p) >= PASSWORD_MIN_LEN, f"Mínimo {PASSWORD_MIN_LEN} caracteres"),
    (lambda p: re.search(r"[A-Z]", p) is not None, "Al menos una mayúscula"),
    (lambda p: re.search(r"[a-z]", p) is not None, "Al menos una minúscula"),
    (lambda p: re.search(r"\d", p) is not None, "Al menos un número"),
    (lambda p: re.search(r"[^A-Za-z0-9]", p) is not None, "Al menos un símbolo"),
]


def validar_password(password: str) -> list[str]:
    """Devuelve la lista de requisitos NO cumplidos (vacía si la clave es válida)."""
    return [msg for ok, msg in _REGLAS if not ok(password)]


def generar_token_url() -> str:
    """Token aleatorio seguro para enlaces de invitación."""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": subject, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str) -> str | None:
    """Devuelve el subject (email) del JWT, o None si es inválido/expirado."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
    return payload.get("sub")
