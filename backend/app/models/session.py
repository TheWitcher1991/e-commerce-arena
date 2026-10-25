import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.game import GameRound
    from app.models.invite import LeaderInvite
    from app.models.team import Team
    from app.models.user import User


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(80), nullable=False)
    course: Mapped[str] = mapped_column(String(160), nullable=False)
    join_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    scenario_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    scenario_snapshot: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True, nullable=False)
    current_round: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    results_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    teacher: Mapped["User"] = relationship(back_populates="sessions")
    teams: Mapped[list["Team"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    rounds: Mapped[list["GameRound"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    leader_invites: Mapped[list["LeaderInvite"]] = relationship(back_populates="session", cascade="all, delete-orphan")
