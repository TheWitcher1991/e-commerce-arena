"""Add four per-team leader invitations and immutable scenario snapshot.

Revision ID: 0002_team_invites_snapshot
Revises: 0001_initial_schema
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_team_invites_snapshot"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "game_sessions",
        sa.Column("scenario_snapshot", sa.JSON(), server_default=sa.text("'{}'"), nullable=False),
    )
    op.add_column("game_sessions", sa.Column("paused_at", sa.DateTime(timezone=True)))
    op.create_table(
        "leader_invites",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(24), nullable=False),
        sa.Column("team_id", sa.Uuid(as_uuid=True), sa.ForeignKey("teams.id", ondelete="SET NULL"), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("claimed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_leader_invites_session_id", "leader_invites", ["session_id"])
    op.create_index("ix_leader_invites_code", "leader_invites", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_leader_invites_code", table_name="leader_invites")
    op.drop_index("ix_leader_invites_session_id", table_name="leader_invites")
    op.drop_table("leader_invites")
    op.drop_column("game_sessions", "paused_at")
    op.drop_column("game_sessions", "scenario_snapshot")
