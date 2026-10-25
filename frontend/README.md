# E-Commerce Arena frontend

Frontend application using Next.js 16 App Router, React 19, TypeScript, TanStack Query, and Tailwind CSS v4. The application calls the FastAPI service; configure `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`).

The code is organized with Feature-Sliced Design. See [ARCHITECTURE.md](./ARCHITECTURE.md) for layer responsibilities and import rules.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Routes

- `/` — teacher dashboard
- `/register` and `/login` — account entry flows for teachers and team leaders
- `/leader` — connect a team leader to a teacher's session and create the team invite
- `/teacher/sessions` — teacher's sessions
- `/teacher/sessions/new` — create a session
- `/teacher/sessions/[sessionId]` — session control and team status
- `/teacher/teams` — teams across the teacher's sessions
- `/join` — join a team by invitation code
- `/team` — team's current round and decision form
- `/screen/[sessionId]` — audience scoreboard

## Product flow

- Teachers create and control a session, share one of four leader invitations, manage rounds, publish results, assess teams, review the audit log, and export CSV.
- Leaders register, join with a teacher invitation, create a team, then share its participant invitation.
- Participants join without accounts and receive a restricted token. Only the leader submits the team's decision.
- The three-round scenario includes the CPC crisis in round two. Rehearsal mode is out of scope.

The frontend stores the short-lived bearer token in `sessionStorage`; it is sent only to the configured API. Authorization is enforced by the backend. The UI has not been browser- or live-API-verified unless a separate environment with running services is explicitly used.
