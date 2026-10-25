from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AccountRole(StrEnum):
    TEACHER = "teacher"
    LEADER = "leader"


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=80, strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    role: AccountRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: AccountRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse | None = None
