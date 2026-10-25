from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=80, strip_whitespace=True)
    course: str = Field(default="Программные средства электронной коммерции", max_length=160)


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    course: str
    scenario_version: str
    status: str
    current_round: int
    team_count: int = 0
    created_at: datetime


class TeamSummary(BaseModel):
    id: UUID
    name: str
    leader_name: str
    member_count: int
    submitted: bool
    invite_code: str


class LeaderInviteSummary(BaseModel):
    code: str
    claimed: bool
    team_name: str | None = None


class AuditEventSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: UUID
    actor_role: str
    action: str
    payload: dict[str, object]
    created_at: datetime


class RoundSummary(BaseModel):
    id: UUID
    number: int
    status: str
    results_published: bool
    opened_at: datetime | None
    deadline_at: datetime | None
    locked_at: datetime | None


class SessionDetail(SessionSummary):
    teams: list[TeamSummary]
    rounds: list[RoundSummary]
    leader_invites: list[LeaderInviteSummary]
    crisis: dict[str, str] | None = None


class SessionJoinRequest(BaseModel):
    join_code: str = Field(min_length=4, max_length=20)
    team_name: str = Field(min_length=2, max_length=50, strip_whitespace=True)


class SessionJoinResponse(BaseModel):
    team_id: UUID
    team_name: str
    invite_code: str
    session_id: UUID
    session_title: str


class RoundOpenRequest(BaseModel):
    duration_seconds: int = Field(default=180, ge=60, le=3600)


class CrisisCreate(BaseModel):
    event_type: str = Field(pattern=r"^ads_cpc_spike_40$")
