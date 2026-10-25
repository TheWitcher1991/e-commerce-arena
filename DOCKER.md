# Docker setup

Docker Compose describes a local stack with PostgreSQL, the FastAPI API, and the Next.js frontend. The database and published application ports bind to `127.0.0.1` by default.

## Configure

Copy `.env.example` to `.env`. Replace `POSTGRES_PASSWORD` and `JWT_SECRET_KEY` with generated random hexadecimal values (for example, `openssl rand -hex 24` and `openssl rand -hex 32`). Hexadecimal values keep the PostgreSQL URL safe to interpolate. Do not commit `.env`.

## Build and start manually

Apply the database schema as a one-off operation, then start the stack:

```bash
docker compose --profile tools run --build --rm migrate
docker compose up --build -d
```

The migration service is intentionally separate from the API service, so API replicas do not race to migrate the database at startup. Re-run the migration command after deploying schema changes.

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Override `FRONTEND_PORT`, `BACKEND_PORT`, or `POSTGRES_PORT` in `.env` to change host ports. The frontend's `NEXT_PUBLIC_API_URL` is embedded at build time.

The frontend currently uses demo browser storage for most flows; this stack does not imply that those screens have been wired to the API yet.
