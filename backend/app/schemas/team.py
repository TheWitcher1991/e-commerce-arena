from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TeamJoinRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=24)
    display_name: str = Field(min_length=2, max_length=80, strip_whitespace=True)


class TeamJoinResponse(BaseModel):
    team_id: UUID
    team_name: str
    session_id: UUID
    session_title: str
    member_id: UUID
    member_name: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TeamMemberResponse(BaseModel):
    id: UUID
    display_name: str
    joined_at: datetime


class TeamCurrentResponse(BaseModel):
    team_id: UUID
    team_name: str
    leader_name: str
    session_id: UUID
    session_title: str
    session_status: str
    current_round: int
    round_status: str | None
    round_deadline_at: datetime | None
    members: list[TeamMemberResponse]
    can_submit_decision: bool
