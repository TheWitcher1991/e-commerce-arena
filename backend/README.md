# E-Commerce Arena API

FastAPI service for accounts, teacher-owned game sessions, team invitations, round decisions, server-side scoring, assessment, and CSV export.

## Requirements

- Python 3.12+
- PostgreSQL 15+

## Create the virtual environment

The repository is set up to keep the environment inside this folder:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
cp .env.example .env
```

Set `JWT_SECRET_KEY` in `.env` to a random value of at least 32 bytes before using the API. `DATABASE_URL` points to a local PostgreSQL database by default.

## Database migrations

Create an empty PostgreSQL database, configure `DATABASE_URL`, then apply the checked-in Alembic migration:

```bash
alembic upgrade head
```

Create later schema changes with `alembic revision --autogenerate -m "describe change"`, inspect the generated migration, then apply it with `alembic upgrade head`.

## Start the API

```bash
uvicorn app.main:app --reload
```

The API is served under `/api/v1`; interactive OpenAPI docs are available at `/docs` in development.

## Main endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `POST /sessions`, `GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/start`
- `POST /sessions/join` (leader claims a single-use invitation and creates a team)
- `POST /teams/join`, `GET /teams/me`, `GET /teams/me/defense-card`
- `POST /sessions/{id}/rounds/{n}/open`, `PUT /sessions/{id}/rounds/{n}/decision`, `POST /sessions/{id}/rounds/{n}/lock`
- `POST /sessions/{id}/pause`, `POST /sessions/{id}/resume`
- `POST /sessions/{id}/crises`, `POST /sessions/{id}/results/publish`, `GET /sessions/{id}/rounds/{n}/results`
- `GET /sessions/{id}/audit`, `PUT /sessions/{id}/assessments`, `GET /sessions/{id}/assessments`
- `GET /public/sessions/{id}/screen` (read-only audience display)
- `GET /sessions/{id}/export.csv`

Decision submissions require an `Idempotency-Key` header. Team participant tokens are limited to participant-facing team and published-result reads; they cannot submit business decisions or access teacher controls.

## Roles and invitation flow

1. A teacher registers and creates a session. It includes four individual, single-use leader invitations.
2. A team leader registers and joins with one invitation, creating their team.
3. The team response contains a team invitation code. Participants join with a display name and receive a restricted participant token; they do not need accounts.
4. Only the team leader can submit a final round decision. The teacher controls round state, crisis activation, result publication, assessment, and export.

There is no rehearsal mode. The frontend is connected to this API contract; browser storage is not an authorization mechanism. Tokens are bearer credentials and must only be transported over HTTPS outside local development.
