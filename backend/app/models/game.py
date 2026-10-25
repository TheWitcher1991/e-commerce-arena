import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import GameSession
    from app.models.team import Team


class GameRound(Base):
    __tablename__ = "game_rounds"
    __table_args__ = (UniqueConstraint("session_id", "number", name="uq_round_session_number"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True, nullable=False)
    results_published: Mapped[bool] = mapped_column(default=False, nullable=False)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    session: Mapped["GameSession"] = relationship(back_populates="rounds")
    crises: Mapped[list["CrisisEvent"]] = relationship(back_populates="round", cascade="all, delete-orphan")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="round", cascade="all, delete-orphan")
    metrics: Mapped[list["MetricSnapshot"]] = relationship(back_populates="round", cascade="all, delete-orphan")


class CrisisEvent(Base):
    __tablename__ = "crisis_events"
    __table_args__ = (UniqueConstraint("round_id", name="uq_crisis_round"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True)
    round_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_rounds.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped["GameRound"] = relationship(back_populates="crises")


class Decision(Base):
    __tablename__ = "decisions"
    __table_args__ = (
        UniqueConstraint("round_id", "team_id", "revision", name="uq_decision_revision"),
        UniqueConstraint("round_id", "team_id", "idempotency_key", name="uq_decision_idempotency"),
        Index("ix_decisions_round_team_revision", "round_id", "team_id", "revision"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    round_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_rounds.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped["GameRound"] = relationship(back_populates="decisions")
    team: Mapped["Team"] = relationship(back_populates="decisions")


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    __table_args__ = (UniqueConstraint("round_id", "team_id", name="uq_metrics_round_team"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    round_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_rounds.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    trace: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped["GameRound"] = relationship(back_populates="metrics")
    team: Mapped["Team"] = relationship(back_populates="metrics")


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        UniqueConstraint("session_id", "team_id", name="uq_assessment_session_team"),
        CheckConstraint("economics_score BETWEEN 0 AND 4", name="ck_assessment_economics"),
        CheckConstraint("technology_score BETWEEN 0 AND 4", name="ck_assessment_technology"),
        CheckConstraint("crisis_score BETWEEN 0 AND 4", name="ck_assessment_crisis"),
        CheckConstraint("teamwork_score BETWEEN 0 AND 2", name="ck_assessment_teamwork"),
        CheckConstraint("reflection_score BETWEEN 0 AND 2", name="ck_assessment_reflection"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    economics_score: Mapped[int] = mapped_column(Integer, nullable=False)
    technology_score: Mapped[int] = mapped_column(Integer, nullable=False)
    crisis_score: Mapped[int] = mapped_column(Integer, nullable=False)
    teamwork_score: Mapped[int] = mapped_column(Integer, nullable=False)
    reflection_score: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def total_score(self) -> int:
        return self.economics_score + self.technology_score + self.crisis_score + self.teamwork_score + self.reflection_score
