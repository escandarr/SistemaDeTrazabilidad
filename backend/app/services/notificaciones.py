"""Notificaciones al usuario — hook de envío de correo (RF01).

Hoy el flujo es por enlace copiable: el admin comparte el link de invitación.
Esta función deja el punto de extensión listo para enchufar SMTP o un servicio
transaccional (Resend/SendGrid) sin tocar los endpoints: basta implementar el
envío aquí cuando se configuren las credenciales correspondientes.
"""
import logging

logger = logging.getLogger("notificaciones")


async def enviar_invitacion(email: str, nombre: str, token: str) -> bool:
    """Envía (o registra) la invitación. Devuelve True si se despachó por correo.

    Mientras no haya proveedor de correo configurado, solo registra el evento y
    devuelve False (el frontend entrega el enlace al admin para compartir).
    """
    logger.info("Invitación generada para %s (%s), token=%s", email, nombre, token)
    return False
