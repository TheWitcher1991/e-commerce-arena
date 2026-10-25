import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, Principal, require_leader, require_teacher
from app.models import AuditEvent, CrisisEvent, Decision, GameRound, GameSession, LeaderInvite, Team, TeamMember
from app.schemas.session import (
    CrisisCreate,
    AuditEventSummary,
    RoundOpenRequest,
    RoundSummary,
    SessionCreate,
    SessionDetail,
    LeaderInviteSummary,
    SessionJoinRequest,
    SessionJoinResponse,
    SessionSummary,
    TeamSummary,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])
Teacher = Annotated[Principal, Depends(require_teacher)]
Leader = Annotated[Principal, Depends(require_leader)]


def _unique_code(db: DbSession, model: type[GameSession] | type[Team], field: str) -> str:
    for _ in range(8):
        code = secrets.token_hex(8).upper()
        exists = db.scalar(select(model.id).where(getattr(model, field) == code))
        if exists is None:
            return code
    raise HTTPException(status_code=503, detail="Could not allocate a unique invitation code")


def _unique_leader_code(db: DbSession, reserved_codes: set[str]) -> str:
    for _ in range(8):
        code = secrets.token_hex(8).upper()
        if code not in reserved_codes and db.scalar(select(LeaderInvite.id).where(LeaderInvite.code == code)) is None:
            reserved_codes.add(code)
            return code
    raise HTTPException(status_code=503, detail="Could not allocate a leader invitation code")


def _get_owned_session(db: DbSession, session_id: UUID, teacher_id: UUID) -> GameSession:
    game_session = db.scalar(
        select(GameSession).where(GameSession.id == session_id, GameSession.teacher_id == teacher_id)
    )
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return game_session


def _get_round(db: DbSession, session_id: UUID, number: int, *, lock: bool = False) -> GameRound:
    query = select(GameRound).where(GameRound.session_id == session_id, GameRound.number == number)
    if lock:
        query = query.with_for_update()
    game_round = db.scalar(query)
    if game_round is None:
        raise HTTPException(status_code=404, detail="Round not found")
    return game_round


def _audit(db: DbSession, game_session: GameSession, principal: Principal, action: str, payload: dict) -> None:
    db.add(
        AuditEvent(
            session_id=game_session.id,
            actor_id=principal.id,
            actor_role=principal.role,
            action=action,
            payload=payload,
        )
    )


def _team_summaries(db: DbSession, game_session: GameSession) -> list[TeamSummary]:
    submitted_teams: set[UUID] = set()
    if game_session.current_round:
        game_round = _get_round(db, game_session.id, game_session.current_round)
        submitted_teams = set(
            db.scalars(
                select(Decision.team_id)
                .where(Decision.round_id == game_round.id)
                .distinct()
            ).all()
        )
    teams = db.scalars(select(Team).where(Team.session_id == game_session.id).order_by(Team.created_at)).all()
    summaries = []
    for team in teams:
        summaries.append(
            TeamSummary(
                id=team.id,
                name=team.name,
                leader_name=team.leader.full_name,
                member_count=db.scalar(
                    select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id, TeamMember.is_active.is_(True))
                )
                or 0,
                submitted=team.id in submitted_teams,
                invite_code=team.invite_code,
            )
        )
    return summaries


def _round_summaries(db: DbSession, game_session: GameSession) -> list[RoundSummary]:
    rounds = db.scalars(
        select(GameRound).where(GameRound.session_id == game_session.id).order_by(GameRound.number)
    ).all()
    return [RoundSummary.model_validate(game_round) for game_round in rounds]


def _session_summary(db: DbSession, game_session: GameSession) -> SessionSummary:
    return SessionSummary(
        id=game_session.id,
        title=game_session.title,
        course=game_session.course,
        scenario_version=game_session.scenario_version,
        status=game_session.status,
        current_round=game_session.current_round,
        team_count=db.scalar(select(func.count(Team.id)).where(Team.session_id == game_session.id)) or 0,
        created_at=game_session.created_at,
    )


def _session_detail(db: DbSession, game_session: GameSession) -> SessionDetail:
    current_crisis = None
    if game_session.current_round:
        current = _get_round(db, game_session.id, game_session.current_round)
        crisis = db.scalar(select(CrisisEvent).where(CrisisEvent.round_id == current.id))
        if crisis:
            current_crisis = {"event_type": crisis.event_type, "activated_at": crisis.activated_at.isoformat()}
    return SessionDetail(
        **_session_summary(db, game_session).model_dump(),
        teams=_team_summaries(db, game_session),
        rounds=_round_summaries(db, game_session),
        leader_invites=[
            LeaderInviteSummary(
                code=invite.code,
                claimed=invite.team_id is not None,
                team_name=invite.team.name if invite.team_id is not None and invite.team else None,
            )
            for invite in db.scalars(
                select(LeaderInvite).where(LeaderInvite.session_id == game_session.id).order_by(LeaderInvite.created_at)
            ).all()
        ],
        crisis=current_crisis,
    )


@router.post("", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, principal: Teacher, db: DbSession) -> SessionDetail:
    game_session = GameSession(
        teacher_id=principal.id,
        title=payload.title,
        course=payload.course.strip(),
        join_code=_unique_code(db, GameSession, "join_code"),
        scenario_snapshot={
            "version": "1.0",
            "round_count": 3,
            "team_limit": 4,
            "participants_per_team": 5,
            "crisis_round": 2,
            "crisis": "ads_cpc_spike_40",
            "base_price": 3000,
            "product_cost": 1450,
            "base_cpc": {"ads_search": 18, "ads_social": 22},
            "base_conversion": 0.03,
            "default_marketing_budget": 18000,
        },
        status="draft",
        current_round=0,
    )
    game_session.rounds = [GameRound(number=round_number, status="pending") for round_number in range(1, 4)]
    invite_codes: set[str] = set()
    game_session.leader_invites = [LeaderInvite(code=_unique_leader_code(db, invite_codes)) for _ in range(4)]
    db.add(game_session)
    db.flush()
    _audit(db, game_session, principal, "session.created", {"title": game_session.title})
    db.commit()
    db.refresh(game_session)
    return _session_detail(db, game_session)


@router.post("/{session_id}/pause", response_model=SessionDetail)
def pause_session(session_id: UUID, principal: Teacher, db: DbSession) -> SessionDetail:
    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "active":
        raise HTTPException(status_code=409, detail="Only an active session can be paused")
    now = datetime.now(UTC)
    game_session.status = "paused"
    game_session.paused_at = now
    _audit(db, game_session, principal, "session.paused", {"round": game_session.current_round})
    db.commit()
    db.refresh(game_session)
    return _session_detail(db, game_session)


@router.post("/{session_id}/resume", response_model=SessionDetail)
def resume_session(session_id: UUID, principal: Teacher, db: DbSession) -> SessionDetail:
    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "paused" or game_session.paused_at is None:
        raise HTTPException(status_code=409, detail="Only a paused session can be resumed")
    now = datetime.now(UTC)
    game_round = _get_round(db, game_session.id, game_session.current_round, lock=True)
    if game_round.status == "open" and game_round.deadline_at is not None:
        game_round.deadline_at += now - game_session.paused_at
    game_session.status = "active"
    game_session.paused_at = None
    _audit(db, game_session, principal, "session.resumed", {"round": game_session.current_round})
    db.commit()
    db.refresh(game_session)
    return _session_detail(db, game_session)


@router.get("", response_model=list[SessionSummary])
def list_sessions(principal: Teacher, db: DbSession) -> list[SessionSummary]:
    rows = db.execute(
        select(GameSession, func.count(Team.id))
        .outerjoin(Team, Team.session_id == GameSession.id)
        .where(GameSession.teacher_id == principal.id)
        .group_by(GameSession.id)
        .order_by(GameSession.created_at.desc())
    ).all()
    return [
        SessionSummary(
            id=game_session.id,
            title=game_session.title,
            course=game_session.course,
            scenario_version=game_session.scenario_version,
            status=game_session.status,
            current_round=game_session.current_round,
            team_count=team_count,
            created_at=game_session.created_at,
        )
        for game_session, team_count in rows
    ]


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: UUID, principal: Teacher, db: DbSession) -> SessionDetail:
    game_session = _get_owned_session(db, session_id, principal.id)
    return _session_detail(db, game_session)


@router.get("/{session_id}/audit", response_model=list[AuditEventSummary])
def list_session_audit(session_id: UUID, principal: Teacher, db: DbSession) -> list[AuditEventSummary]:
    _get_owned_session(db, session_id, principal.id)
    events = db.scalars(
        select(AuditEvent).where(AuditEvent.session_id == session_id).order_by(AuditEvent.created_at.desc()).limit(200)
    ).all()
    return [AuditEventSummary.model_validate(event) for event in events]


@router.post("/join", response_model=SessionJoinResponse, status_code=status.HTTP_201_CREATED)
def join_session(payload: SessionJoinRequest, principal: Leader, db: DbSession) -> SessionJoinResponse:
    invite = db.scalar(
        select(LeaderInvite).where(LeaderInvite.code == payload.join_code.strip().upper()).with_for_update()
    )
    game_session = db.get(GameSession, invite.session_id) if invite is not None else None
    if game_session is None or game_session.status != "draft":
        raise HTTPException(status_code=404, detail="Leader invitation is invalid or no longer accepting teams")
    existing = db.scalar(
        select(Team).where(Team.session_id == game_session.id, Team.leader_id == principal.id)
    )
    if existing is not None:
        return SessionJoinResponse(
            team_id=existing.id,
            team_name=existing.name,
            invite_code=existing.invite_code,
            session_id=game_session.id,
            session_title=game_session.title,
        )

    if invite.team_id is not None:
        raise HTTPException(status_code=409, detail="This leader invitation has already been used")

    team = Team(
        session_id=game_session.id,
        leader_id=principal.id,
        name=payload.team_name,
        invite_code=_unique_code(db, Team, "invite_code"),
    )
    db.add(team)
    db.flush()
    invite.team_id = team.id
    invite.claimed_at = datetime.now(UTC)
    _audit(db, game_session, principal, "team.created", {"team_id": str(team.id), "team_name": team.name})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(Team).where(Team.session_id == game_session.id, Team.leader_id == principal.id))
        if existing is None:
            raise HTTPException(status_code=409, detail="A team with this name or leader already exists") from None
        team = existing
    return SessionJoinResponse(
        team_id=team.id,
        team_name=team.name,
        invite_code=team.invite_code,
        session_id=game_session.id,
        session_title=game_session.title,
    )


@router.post("/{session_id}/start", response_model=SessionDetail)
def start_session(session_id: UUID, principal: Teacher, db: DbSession) -> SessionDetail:
    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "draft":
        raise HTTPException(status_code=409, detail="Only a draft session can be started")
    team_count = db.scalar(select(func.count(Team.id)).where(Team.session_id == game_session.id, Team.is_active.is_(True))) or 0
    if team_count != 4:
        raise HTTPException(status_code=409, detail="All four teams must join before starting")
    first_round = _get_round(db, game_session.id, 1, lock=True)
    now = datetime.now(UTC)
    game_session.status = "active"
    game_session.current_round = 1
    game_session.started_at = now
    first_round.status = "open"
    first_round.opened_at = now
    first_round.deadline_at = now + timedelta(seconds=600)
    _audit(db, game_session, principal, "session.started", {"round": 1})
    db.commit()
    db.refresh(game_session)
    return _session_detail(db, game_session)


@router.post("/{session_id}/rounds/{round_number}/open", response_model=RoundSummary)
def open_round(
    session_id: UUID,
    round_number: int,
    payload: RoundOpenRequest,
    principal: Teacher,
    db: DbSession,
) -> RoundSummary:
    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "active" or round_number != game_session.current_round + 1:
        raise HTTPException(status_code=409, detail="Open only the next round of an active session")
    previous = _get_round(db, game_session.id, game_session.current_round)
    if previous.status != "locked":
        raise HTTPException(status_code=409, detail="Lock the current round before opening the next one")
    game_round = _get_round(db, game_session.id, round_number, lock=True)
    if game_round.status != "pending":
        raise HTTPException(status_code=409, detail="This round is not pending")
    now = datetime.now(UTC)
    game_round.status = "open"
    game_round.opened_at = now
    game_round.deadline_at = now + timedelta(seconds=payload.duration_seconds)
    game_session.current_round = round_number
    _audit(db, game_session, principal, "round.opened", {"round": round_number})
    db.commit()
    db.refresh(game_round)
    return RoundSummary.model_validate(game_round)


@router.post("/{session_id}/rounds/{round_number}/lock", response_model=RoundSummary)
def lock_round(session_id: UUID, round_number: int, principal: Teacher, db: DbSession) -> RoundSummary:
    from app.models import MetricSnapshot
    from app.services.game_engine import MODEL_VERSION, calculate_round

    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "active" or round_number != game_session.current_round:
        raise HTTPException(status_code=409, detail="Only the current round of an active session can be locked")
    game_round = _get_round(db, game_session.id, round_number, lock=True)
    if game_round.status != "open":
        raise HTTPException(status_code=409, detail="Round is not open")

    if round_number == 2 and db.scalar(select(CrisisEvent.id).where(CrisisEvent.round_id == game_round.id)) is None:
        raise HTTPException(status_code=409, detail="Activate the shared crisis before locking round two")

    crisis_types = set(db.scalars(select(CrisisEvent.event_type).where(CrisisEvent.round_id == game_round.id)).all())
    teams = db.scalars(select(Team).where(Team.session_id == game_session.id)).all()
    for team in teams:
        latest = db.scalar(
            select(Decision)
            .where(Decision.round_id == game_round.id, Decision.team_id == team.id)
            .order_by(Decision.revision.desc())
            .limit(1)
        )
        if latest is None:
            continue
        metrics, trace = calculate_round(latest.payload, crisis_types)
        db.add(
            MetricSnapshot(
                round_id=game_round.id,
                team_id=team.id,
                model_version=MODEL_VERSION,
                metrics=metrics,
                trace=trace,
            )
        )
    game_round.status = "locked"
    game_round.locked_at = datetime.now(UTC)
    if round_number == 3:
        game_session.status = "completed"
        game_session.finished_at = datetime.now(UTC)
    _audit(db, game_session, principal, "round.locked", {"round": round_number})
    db.commit()
    db.refresh(game_round)
    return RoundSummary.model_validate(game_round)


@router.post("/{session_id}/crises", response_model=dict[str, str], status_code=status.HTTP_201_CREATED)
def activate_crisis(session_id: UUID, payload: CrisisCreate, principal: Teacher, db: DbSession) -> dict[str, str]:
    game_session = _get_owned_session(db, session_id, principal.id)
    if game_session.status != "active" or game_session.current_round < 1:
        raise HTTPException(status_code=409, detail="A crisis can only be activated during an active round")
    if game_session.current_round != 2 or payload.event_type != "ads_cpc_spike_40":
        raise HTTPException(status_code=409, detail="The MVP crisis is available only in round two")
    game_round = _get_round(db, game_session.id, game_session.current_round, lock=True)
    if game_round.status != "open":
        raise HTTPException(status_code=409, detail="Crisis activation is closed for this round")
    if db.scalar(select(CrisisEvent.id).where(CrisisEvent.round_id == game_round.id)) is not None:
        raise HTTPException(status_code=409, detail="A crisis has already been activated for this round")
    crisis = CrisisEvent(
        session_id=game_session.id,
        round_id=game_round.id,
        event_type=payload.event_type,
        payload={"applies_to": "all_teams", "is_random": False},
    )
    db.add(crisis)
    _audit(db, game_session, principal, "crisis.activated", {"round": game_round.number, "event_type": payload.event_type})
    db.commit()
    return {"event_type": payload.event_type, "status": "activated"}


@router.post("/{session_id}/results/publish", response_model=dict[str, str])
def publish_results(session_id: UUID, principal: Teacher, db: DbSession) -> dict[str, str]:
    game_session = _get_owned_session(db, session_id, principal.id)
    locked_rounds = db.scalars(
        select(GameRound).where(GameRound.session_id == game_session.id, GameRound.status == "locked")
    ).all()
    if not locked_rounds:
        raise HTTPException(status_code=409, detail="No locked round results are ready to publish")
    for game_round in locked_rounds:
        game_round.results_published = True
    game_session.results_published = True
    _audit(db, game_session, principal, "results.published", {"rounds": [r.number for r in locked_rounds]})
    db.commit()
    return {"status": "published"}
