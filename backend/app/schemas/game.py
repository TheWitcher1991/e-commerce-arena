from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class DecisionCreate(BaseModel):
    price: Literal[2700, 3000, 3300]
    cms_option: Literal["platform_basic", "platform_extended"]
    payment_option: Literal["payment_standard", "payment_reserve"]
    delivery_option: Literal["delivery_standard", "delivery_express"]
    marketing_channel: Literal["ads_search", "ads_social"]
    marketing_budget: int = Field(ge=8000, le=26000, multiple_of=2000)
    rationale: str = Field(min_length=20, max_length=1000, strip_whitespace=True)


class DecisionResponse(BaseModel):
    decision_id: UUID
    round_id: UUID
    revision: int
    submitted_at: datetime
    idempotent_replay: bool = False


class MetricValues(BaseModel):
    visits: int
    paid_orders: int
    revenue: int
    unit_contribution: float
    contribution_total: float
    marketing_cost: int
    fixed_cost: int
    profit: float
    cac: float | None
    sales_margin_percent: float | None
    break_even_orders: int | None


class TeamRoundResult(BaseModel):
    team_id: UUID
    team_name: str
    round_number: int
    model_version: str
    metrics: MetricValues
    trace: dict[str, float | int | str | None]


class CrisisResult(BaseModel):
    event_type: str
    title: str


class AudienceTeamRow(BaseModel):
    place: int | None
    team_name: str
    paid_orders: int | None
    profit: float | None
    submitted: bool


class AudienceScreenResponse(BaseModel):
    session_id: UUID
    title: str
    status: str
    current_round: int
    round_status: str | None
    team_count: int
    submitted_count: int
    published: bool
    crisis: CrisisResult | None
    ranking: list[AudienceTeamRow]


class AssessmentCreate(BaseModel):
    team_id: UUID
    economics_score: int = Field(ge=0, le=4)
    technology_score: int = Field(ge=0, le=4)
    crisis_score: int = Field(ge=0, le=4)
    teamwork_score: int = Field(ge=0, le=2)
    reflection_score: int = Field(ge=0, le=2)
    comment: str | None = Field(default=None, max_length=2000)


class AssessmentResponse(AssessmentCreate):
    id: UUID
    total_score: int


class SessionExportRow(BaseModel):
    session_id: UUID
    team_id: UUID
    team_name: str
    round_number: int
    metrics: MetricValues
    assessment_total: int | None


class DefenseRoundCard(BaseModel):
    round_number: int
    round_status: str
    published: bool
    crisis_title: str | None
    decision: dict[str, int | str | bool | None] | None
    metrics: MetricValues | None


class DefenseCardResponse(BaseModel):
    session_id: UUID
    session_title: str
    team_id: UUID
    team_name: str
    leader_name: str
    rounds: list[DefenseRoundCard]
    defense_questions: list[str]
