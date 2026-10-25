from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models import TeamMember, User

DbSession = Annotated[Session, Depends(get_db)]
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    id: UUID
    role: str
    user: User | None = None
    member: TeamMember | None = None


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> Principal:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    claims = decode_access_token(credentials.credentials)
    if claims is None:
        raise unauthorized
    try:
        subject = UUID(claims["sub"])
    except (KeyError, ValueError, TypeError):
        raise unauthorized from None

    if claims.get("principal_type") == "participant" and claims.get("role") == "participant":
        member = db.get(TeamMember, subject)
        if member is None or not member.is_active:
            raise unauthorized
        return Principal(id=member.id, role="participant", member=member)

    if claims.get("principal_type") != "user":
        raise unauthorized
    user = db.get(User, subject)
    if user is None or not user.is_active or user.role != claims.get("role"):
        raise unauthorized
    if user.role not in {"teacher", "leader"}:
        raise unauthorized
    return Principal(id=user.id, role=user.role, user=user)


def require_teacher(principal: Annotated[Principal, Depends(get_current_principal)]) -> Principal:
    if principal.role != "teacher" or principal.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")
    return principal


def require_leader(principal: Annotated[Principal, Depends(get_current_principal)]) -> Principal:
    if principal.role != "leader" or principal.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team leader access required")
    return principal


def require_team_actor(principal: Annotated[Principal, Depends(get_current_principal)]) -> Principal:
    if principal.role not in {"leader", "participant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team access required")
    return principal
