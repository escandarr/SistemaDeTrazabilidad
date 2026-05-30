"""RF01 — Autenticación y control de acceso basado en roles."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.crud import usuario as crud_usuario
from app.models.usuario import Usuario
from app.schemas.usuario import Token, UsuarioCreate, UsuarioRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
async def register(data: UsuarioCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    if await crud_usuario.get_by_email(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "El email ya está registrado")
    return await crud_usuario.create(db, data)


@router.post("/login", response_model=Token)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await crud_usuario.get_by_email(db, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")
    return Token(access_token=create_access_token(user.email))


@router.get("/me", response_model=UsuarioRead)
async def me(current: Annotated[Usuario, Depends(get_current_user)]):
    return current
