from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, Principal, get_current_principal, require_leader
from app.api.v1.endpoints.sessions import _audit, _get_owned_session, _get_round
from app.models import Decision, GameRound, GameSession, MetricSnapshot, Team
from app.schemas.game import DecisionCreate, DecisionResponse, MetricValues, TeamRoundResult
from app.services.game_engine import MODEL_VERSION

router = APIRouter(tags=["Game"])
Leader = Annotated[Principal, Depends(require_leader)]


@router.put(
    "/sessions/{session_id}/rounds/{round_number}/decision",
    response_model=DecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_decision(
    session_id: UUID,
    round_number: int,
    payload: DecisionCreate,
    principal: Leader,
    db: DbSession,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=8, max_length=128)],
) -> DecisionResponse:
    team = db.scalar(
        select(Team).where(
            Team.session_id == session_id,
            Team.leader_id == principal.id,
            Team.is_active.is_(True),
        )
    )
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found in this session")
    game_session = db.get(GameSession, session_id)
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    game_round = _get_round(db, session_id, round_number, lock=True)
    normalized_key = idempotency_key.strip()
    if len(normalized_key) < 8:
        raise HTTPException(status_code=422, detail="Idempotency-Key must contain at least eight non-space characters")
    decision_payload = payload.model_dump(mode="json")
    replay = db.scalar(
        select(Decision).where(
            Decision.round_id == game_round.id,
            Decision.team_id == team.id,
            Decision.idempotency_key == normalized_key,
        )
    )
    if replay is not None:
        if replay.payload != decision_payload:
            raise HTTPException(status_code=409, detail="Idempotency key was already used for a different decision")
        return DecisionResponse(
            decision_id=replay.id,
            round_id=game_round.id,
            revision=replay.revision,
            submitted_at=replay.submitted_at,
            idempotent_replay=True,
        )

    if game_session.status != "active" or game_session.current_round != round_number or game_round.status != "open":
        raise HTTPException(status_code=409, detail="Decision submission is closed for this round")
    if game_round.deadline_at is not None and datetime.now(UTC) >= game_round.deadline_at:
        raise HTTPException(status_code=409, detail="Decision deadline has passed")

    latest_revision = db.scalar(
        select(func.max(Decision.revision)).where(
            Decision.round_id == game_round.id,
            Decision.team_id == team.id,
        )
    ) or 0
    decision = Decision(
        round_id=game_round.id,
        team_id=team.id,
        revision=latest_revision + 1,
        payload=decision_payload,
        idempotency_key=normalized_key,
    )
    db.add(decision)
    _audit(db, game_session, principal, "decision.submitted", {"round": round_number, "team_id": str(team.id), "revision": latest_revision + 1})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        replay = db.scalar(
            select(Decision).where(
                Decision.round_id == game_round.id,
                Decision.team_id == team.id,
                Decision.idempotency_key == normalized_key,
            )
        )
        if replay is not None and replay.payload == decision_payload:
            return DecisionResponse(
                decision_id=replay.id,
                round_id=game_round.id,
                revision=replay.revision,
                submitted_at=replay.submitted_at,
                idempotent_replay=True,
            )
        raise HTTPException(status_code=409, detail="Decision revision conflict; reload and resubmit") from None
    db.refresh(decision)
    return DecisionResponse(
        decision_id=decision.id,
        round_id=game_round.id,
        revision=decision.revision,
        submitted_at=decision.submitted_at,
    )


@router.get(
    "/sessions/{session_id}/rounds/{round_number}/results",
    response_model=list[TeamRoundResult],
)
def get_round_results(
    session_id: UUID,
    round_number: int,
    principal: Annotated[Principal, Depends(get_current_principal)],
    db: DbSession,
) -> list[TeamRoundResult]:
    game_session = db.get(GameSession, session_id)
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    game_round = _get_round(db, session_id, round_number)

    if principal.role == "teacher":
        _get_owned_session(db, session_id, principal.id)
    else:
        if principal.role == "leader":
            actor_team = db.scalar(
                select(Team).where(Team.session_id == session_id, Team.leader_id == principal.id)
            )
        elif principal.member is not None:
            actor_team = db.get(Team, principal.member.team_id)
        else:
            actor_team = None
        if actor_team is None or actor_team.session_id != session_id:
            raise HTTPException(status_code=404, detail="Session not found")
        if not game_round.results_published:
            raise HTTPException(status_code=403, detail="Round results have not been published")

    rows = db.execute(
        select(MetricSnapshot, Team)
        .join(Team, Team.id == MetricSnapshot.team_id)
        .where(MetricSnapshot.round_id == game_round.id)
    ).all()
    session_snapshots = db.scalars(
        select(MetricSnapshot).join(GameRound, GameRound.id == MetricSnapshot.round_id)
        .where(GameRound.session_id == session_id)
    ).all()
    totals: dict[UUID, float] = {}
    for snapshot in session_snapshots:
        totals[snapshot.team_id] = totals.get(snapshot.team_id, 0.0) + float(snapshot.metrics["profit"])
    rows.sort(key=lambda row: (float(row[0].metrics["profit"]), float(totals.get(row[1].id, 0))), reverse=True)
    return [
        TeamRoundResult(
            team_id=team.id,
            team_name=team.name,
            round_number=round_number,
            model_version=snapshot.model_version or MODEL_VERSION,
            metrics=MetricValues.model_validate(snapshot.metrics),
            trace=snapshot.trace,
        )
        for snapshot, team in rows
    ]
