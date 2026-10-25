from fastapi import APIRouter

from app.api.v1.endpoints import auth, game, reporting, sessions, teams

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(sessions.router)
api_router.include_router(teams.router)
api_router.include_router(game.router)
api_router.include_router(reporting.router)
