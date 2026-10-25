from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import get_settings

_password_hash = PasswordHash.recommended()
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def create_access_token(subject: UUID, role: str, principal_type: str = "user") -> str:
    now = datetime.now(UTC)
    settings = get_settings()
    if principal_type == "participant":
        expires_at = now + timedelta(hours=settings.participant_token_hours)
    else:
        expires_at = now + timedelta(minutes=settings.access_token_minutes)
    claims: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "principal_type": principal_type,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token,
            get_settings().jwt_secret_key.get_secret_value(),
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "role", "principal_type", "exp", "iat"]},
        )
    except (InvalidTokenError, ValueError):
        return None
