"""Initial application schema.

Revision ID: 0001_initial_schema
Revises:
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    uuid = sa.Uuid(as_uuid=True)
    op.create_table(
        "users",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "game_sessions",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("teacher_id", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("course", sa.String(160), nullable=False),
        sa.Column("join_code", sa.String(20), nullable=False),
        sa.Column("scenario_version", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("current_round", sa.Integer(), nullable=False),
        sa.Column("results_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_game_sessions_teacher_id", "game_sessions", ["teacher_id"])
    op.create_index("ix_game_sessions_join_code", "game_sessions", ["join_code"], unique=True)
    op.create_index("ix_game_sessions_status", "game_sessions", ["status"])

    op.create_table(
        "teams",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("session_id", uuid, sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leader_id", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("invite_code", sa.String(24), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("session_id", "leader_id", name="uq_team_session_leader"),
    )
    op.create_index("ix_teams_session_id", "teams", ["session_id"])
    op.create_index("ix_teams_leader_id", "teams", ["leader_id"])
    op.create_index("ix_teams_invite_code", "teams", ["invite_code"], unique=True)

    op.create_table(
        "team_members",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("team_id", uuid, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_team_members_team_id", "team_members", ["team_id"])

    op.create_table(
        "game_rounds",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("session_id", uuid, sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("results_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True)),
        sa.Column("deadline_at", sa.DateTime(timezone=True)),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("session_id", "number", name="uq_round_session_number"),
    )
    op.create_index("ix_game_rounds_session_id", "game_rounds", ["session_id"])
    op.create_index("ix_game_rounds_status", "game_rounds", ["status"])

    op.create_table(
        "crisis_events",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("session_id", uuid, sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("round_id", uuid, sa.ForeignKey("game_rounds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("activated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("round_id", name="uq_crisis_round"),
    )
    op.create_index("ix_crisis_events_session_id", "crisis_events", ["session_id"])
    op.create_index("ix_crisis_events_round_id", "crisis_events", ["round_id"])

    op.create_table(
        "decisions",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("round_id", uuid, sa.ForeignKey("game_rounds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", uuid, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("round_id", "team_id", "revision", name="uq_decision_revision"),
        sa.UniqueConstraint("round_id", "team_id", "idempotency_key", name="uq_decision_idempotency"),
    )
    op.create_index("ix_decisions_round_id", "decisions", ["round_id"])
    op.create_index("ix_decisions_team_id", "decisions", ["team_id"])
    op.create_index("ix_decisions_round_team_revision", "decisions", ["round_id", "team_id", "revision"])

    op.create_table(
        "metric_snapshots",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("round_id", uuid, sa.ForeignKey("game_rounds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", uuid, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_version", sa.String(20), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("trace", sa.JSON(), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("round_id", "team_id", name="uq_metrics_round_team"),
    )
    op.create_index("ix_metric_snapshots_round_id", "metric_snapshots", ["round_id"])
    op.create_index("ix_metric_snapshots_team_id", "metric_snapshots", ["team_id"])

    op.create_table(
        "assessments",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("session_id", uuid, sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", uuid, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("economics_score", sa.Integer(), nullable=False),
        sa.Column("technology_score", sa.Integer(), nullable=False),
        sa.Column("crisis_score", sa.Integer(), nullable=False),
        sa.Column("teamwork_score", sa.Integer(), nullable=False),
        sa.Column("reflection_score", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(2000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("session_id", "team_id", name="uq_assessment_session_team"),
        sa.CheckConstraint("economics_score BETWEEN 0 AND 4", name="ck_assessment_economics"),
        sa.CheckConstraint("technology_score BETWEEN 0 AND 4", name="ck_assessment_technology"),
        sa.CheckConstraint("crisis_score BETWEEN 0 AND 4", name="ck_assessment_crisis"),
        sa.CheckConstraint("teamwork_score BETWEEN 0 AND 2", name="ck_assessment_teamwork"),
        sa.CheckConstraint("reflection_score BETWEEN 0 AND 2", name="ck_assessment_reflection"),
    )
    op.create_index("ix_assessments_session_id", "assessments", ["session_id"])
    op.create_index("ix_assessments_team_id", "assessments", ["team_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("session_id", uuid, sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", uuid, nullable=False),
        sa.Column("actor_role", sa.String(20), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_session_id", "audit_events", ["session_id"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("assessments")
    op.drop_table("metric_snapshots")
    op.drop_table("decisions")
    op.drop_table("crisis_events")
    op.drop_table("game_rounds")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("game_sessions")
    op.drop_table("users")
