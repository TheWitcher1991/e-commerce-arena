import csv
from io import StringIO
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, Principal, require_teacher
from app.api.v1.endpoints.sessions import _audit, _get_owned_session, _get_round
from app.models import Assessment, CrisisEvent, Decision, GameRound, GameSession, MetricSnapshot, Team
from app.schemas.game import (
    AssessmentCreate,
    AssessmentResponse,
    AudienceScreenResponse,
    AudienceTeamRow,
    CrisisResult,
)

router = APIRouter(tags=["Reporting"])
Teacher = Annotated[Principal, Depends(require_teacher)]

_CRISIS_TITLES = {
    "ads_cpc_spike_40": "Рост стоимости рекламы",
    "payment_provider_outage": "Сбой платёжного провайдера",
    "logistics_disruption": "Сбой логистики",
}


@router.get("/public/sessions/{session_id}/screen", response_model=AudienceScreenResponse)
def audience_screen(session_id: UUID, db: DbSession) -> AudienceScreenResponse:
    game_session = db.get(GameSession, session_id)
    if game_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    teams = db.scalars(select(Team).where(Team.session_id == session_id, Team.is_active.is_(True))).all()
    current_round = None
    crisis_result = None
    published = False
    submitted_ids: set[UUID] = set()
    metrics_by_team: dict[UUID, MetricSnapshot] = {}
    if game_session.current_round:
        current_round = _get_round(db, session_id, game_session.current_round)
        crisis = db.scalar(select(CrisisEvent).where(CrisisEvent.round_id == current_round.id))
        if crisis:
            crisis_result = CrisisResult(event_type=crisis.event_type, title=_CRISIS_TITLES.get(crisis.event_type, "Событие"))
        submitted_ids = set(db.scalars(select(Decision.team_id).where(Decision.round_id == current_round.id).distinct()).all())
        published = current_round.results_published
        if published:
            metrics_by_team = {
                snapshot.team_id: snapshot
                for snapshot in db.scalars(select(MetricSnapshot).where(MetricSnapshot.round_id == current_round.id)).all()
            }

    ranking = []
    ranked_teams = sorted(
        teams,
        key=lambda team: (
            float(metrics_by_team[team.id].metrics["profit"]) if team.id in metrics_by_team else float("-inf"),
            team.name.casefold(),
        ),
        reverse=True,
    )
    for index, team in enumerate(ranked_teams, start=1):
        snapshot = metrics_by_team.get(team.id)
        metrics = snapshot.metrics if snapshot else None
        ranking.append(
            AudienceTeamRow(
                place=index if published and snapshot else None,
                team_name=team.name,
                paid_orders=int(metrics["paid_orders"]) if metrics else None,
                profit=float(metrics["profit"]) if metrics else None,
                submitted=team.id in submitted_ids,
            )
        )
    return AudienceScreenResponse(
        session_id=session_id,
        title=game_session.title,
        status=game_session.status,
        current_round=game_session.current_round,
        round_status=current_round.status if current_round else None,
        team_count=len(teams),
        submitted_count=len(submitted_ids),
        published=published,
        crisis=crisis_result,
        ranking=ranking,
    )


@router.put("/sessions/{session_id}/assessments", response_model=AssessmentResponse)
def assess_team(session_id: UUID, payload: AssessmentCreate, principal: Teacher, db: DbSession) -> AssessmentResponse:
    game_session = _get_owned_session(db, session_id, principal.id)
    team = db.scalar(select(Team).where(Team.id == payload.team_id, Team.session_id == session_id))
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found in this session")
    values = payload.model_dump(exclude={"team_id"})
    assessment = db.scalar(select(Assessment).where(Assessment.session_id == session_id, Assessment.team_id == team.id))
    if assessment is None:
        assessment = Assessment(session_id=session_id, team_id=team.id, **values)
        db.add(assessment)
    else:
        for key, value in values.items():
            setattr(assessment, key, value)
    _audit(db, game_session, principal, "team.assessed", {"team_id": str(team.id)})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assessment could not be saved; reload and retry") from None
    db.refresh(assessment)
    return AssessmentResponse(
        team_id=assessment.team_id,
        economics_score=assessment.economics_score,
        technology_score=assessment.technology_score,
        crisis_score=assessment.crisis_score,
        teamwork_score=assessment.teamwork_score,
        reflection_score=assessment.reflection_score,
        comment=assessment.comment,
        id=assessment.id,
        total_score=assessment.total_score,
    )


@router.get("/sessions/{session_id}/assessments", response_model=list[AssessmentResponse])
def list_assessments(session_id: UUID, principal: Teacher, db: DbSession) -> list[AssessmentResponse]:
    _get_owned_session(db, session_id, principal.id)
    assessments = db.scalars(
        select(Assessment).where(Assessment.session_id == session_id).order_by(Assessment.created_at)
    ).all()
    return [
        AssessmentResponse(
            team_id=item.team_id,
            economics_score=item.economics_score,
            technology_score=item.technology_score,
            crisis_score=item.crisis_score,
            teamwork_score=item.teamwork_score,
            reflection_score=item.reflection_score,
            comment=item.comment,
            id=item.id,
            total_score=item.total_score,
        )
        for item in assessments
    ]


@router.get("/sessions/{session_id}/export.csv")
def export_session(session_id: UUID, principal: Teacher, db: DbSession) -> StreamingResponse:
    _get_owned_session(db, session_id, principal.id)
    rows = db.execute(
        select(GameRound.number, Team.id, Team.name, MetricSnapshot.metrics, Assessment)
        .join(MetricSnapshot, MetricSnapshot.round_id == GameRound.id)
        .join(Team, Team.id == MetricSnapshot.team_id)
        .outerjoin(Assessment, (Assessment.session_id == session_id) & (Assessment.team_id == Team.id))
        .where(GameRound.session_id == session_id)
        .order_by(GameRound.number, Team.name)
    ).all()
    output = StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow([
        "round", "team_id", "team", "price", "platform", "payment", "delivery", "marketing_channel",
        "marketing_budget", "rationale", "visits", "paid_orders", "revenue", "profit", "cac", "assessment_total",
    ])
    for number, team_id, team_name, metrics, assessment in rows:
        safe_team_name = f"'{team_name}" if team_name.startswith(("=", "+", "-", "@", "\t", "\r")) else team_name
        latest_decision = db.scalar(
            select(Decision).join(GameRound, GameRound.id == Decision.round_id)
            .where(GameRound.session_id == session_id, GameRound.number == number, Decision.team_id == team_id)
            .order_by(Decision.revision.desc()).limit(1)
        )
        payload = latest_decision.payload if latest_decision else {}
        def safe_text(value: object) -> object:
            if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
                return f"'{value}"
            return value
        writer.writerow([
            number, team_id, safe_team_name, payload.get("price"), safe_text(payload.get("cms_option")),
            safe_text(payload.get("payment_option")), safe_text(payload.get("delivery_option")),
            safe_text(payload.get("marketing_channel")), payload.get("marketing_budget"),
            safe_text(payload.get("rationale")), metrics.get("visits"), metrics.get("paid_orders"), metrics.get("revenue"),
            metrics.get("profit"), metrics.get("cac"), assessment.total_score if assessment else "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="session-{session_id}.csv"'},
    )
