from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import DbSession, Principal, require_team_actor
from app.core.config import get_settings
from app.core.security import create_access_token
from app.models import CrisisEvent, Decision, GameRound, GameSession, MetricSnapshot, Team, TeamMember
from app.schemas.game import DefenseCardResponse, DefenseRoundCard, MetricValues
from app.schemas.team import TeamCurrentResponse, TeamJoinRequest, TeamJoinResponse, TeamMemberResponse

router = APIRouter(prefix="/teams", tags=["Teams"])
TeamActor = Annotated[Principal, Depends(require_team_actor)]


def _get_actor_team(db: DbSession, principal: Principal, session_id: UUID | None = None) -> Team:
    if principal.role == "leader":
        query = select(Team).where(Team.leader_id == principal.id, Team.is_active.is_(True))
        if session_id is not None:
            query = query.where(Team.session_id == session_id)
        query = query.order_by(Team.created_at.desc()).limit(1)
        team = db.scalar(query)
    elif principal.member is not None:
        team = db.scalar(select(Team).where(Team.id == principal.member.team_id, Team.is_active.is_(True)))
    else:
        team = None
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/join", response_model=TeamJoinResponse, status_code=status.HTTP_201_CREATED)
def join_team(payload: TeamJoinRequest, db: DbSession) -> TeamJoinResponse:
    team = db.scalar(
        select(Team).where(Team.invite_code == payload.invite_code.strip().upper(), Team.is_active.is_(True)).with_for_update()
    )
    if team is None:
        raise HTTPException(status_code=404, detail="Team invitation is invalid")
    game_session = db.get(GameSession, team.session_id)
    if game_session is None or game_session.status not in {"draft", "active"}:
        raise HTTPException(status_code=409, detail="This session is no longer accepting participants")
    active_count = db.scalar(
        select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id, TeamMember.is_active.is_(True))
    ) or 0
    if active_count >= 4:
        raise HTTPException(status_code=409, detail="A team can have up to five students, including the leader")

    member = TeamMember(team_id=team.id, display_name=payload.display_name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return TeamJoinResponse(
        team_id=team.id,
        team_name=team.name,
        session_id=game_session.id,
        session_title=game_session.title,
        member_id=member.id,
        member_name=member.display_name,
        access_token=create_access_token(member.id, "participant", principal_type="participant"),
        expires_in=get_settings().participant_token_hours * 3600,
    )


@router.get("/me", response_model=TeamCurrentResponse)
def get_current_team(
    principal: TeamActor,
    db: DbSession,
    session_id: UUID | None = None,
) -> TeamCurrentResponse:
    team = _get_actor_team(db, principal, session_id)
    game_session = db.get(GameSession, team.session_id)
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    current_round = None
    if game_session.current_round:
        current_round = db.scalar(
            select(GameRound).where(
                GameRound.session_id == game_session.id,
                GameRound.number == game_session.current_round,
            )
        )
    members = db.scalars(
        select(TeamMember)
        .where(TeamMember.team_id == team.id, TeamMember.is_active.is_(True))
        .order_by(TeamMember.joined_at)
    ).all()
    return TeamCurrentResponse(
        team_id=team.id,
        team_name=team.name,
        leader_name=team.leader.full_name,
        session_id=game_session.id,
        session_title=game_session.title,
        session_status=game_session.status,
        current_round=game_session.current_round,
        round_status=current_round.status if current_round else None,
        round_deadline_at=current_round.deadline_at if current_round else None,
        members=[TeamMemberResponse.model_validate(member) for member in members],
        can_submit_decision=(
            principal.role == "leader"
            and game_session.status == "active"
            and current_round is not None
            and current_round.status == "open"
        ),
    )


@router.get("/me/defense-card", response_model=DefenseCardResponse)
def get_defense_card(principal: TeamActor, db: DbSession, session_id: UUID | None = None) -> DefenseCardResponse:
    team = _get_actor_team(db, principal, session_id)
    game_session = db.get(GameSession, team.session_id)
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    rounds = db.scalars(
        select(GameRound).where(GameRound.session_id == game_session.id).order_by(GameRound.number)
    ).all()
    cards = []
    for game_round in rounds:
        decision = db.scalar(
            select(Decision).where(Decision.round_id == game_round.id, Decision.team_id == team.id)
            .order_by(Decision.revision.desc()).limit(1)
        )
        snapshot = db.scalar(
            select(MetricSnapshot).where(MetricSnapshot.round_id == game_round.id, MetricSnapshot.team_id == team.id)
        ) if game_round.results_published else None
        crisis = db.scalar(select(CrisisEvent).where(CrisisEvent.round_id == game_round.id))
        cards.append(
            DefenseRoundCard(
                round_number=game_round.number,
                round_status=game_round.status,
                published=game_round.results_published,
                crisis_title="Рост стоимости клика на 40%" if crisis and crisis.event_type == "ads_cpc_spike_40" else None,
                decision=decision.payload if decision else None,
                metrics=MetricValues.model_validate(snapshot.metrics) if snapshot else None,
            )
        )
    return DefenseCardResponse(
        session_id=game_session.id,
        session_title=game_session.title,
        team_id=team.id,
        team_name=team.name,
        leader_name=team.leader.full_name,
        rounds=cards,
        defense_questions=[
            "Какой вариант платформы, цены, оплаты, доставки и рекламы выбрала команда и почему?",
            "Как изменились переходы, заказы, CAC и прибыль после кризиса?",
            "Какой компромисс команда приняла при корректировке стратегии?",
            "Какой вывод команда перенесёт в реальный интернет-магазин?",
        ],
    )
