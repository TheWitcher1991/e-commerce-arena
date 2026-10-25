# Frontend architecture

The frontend follows Feature-Sliced Design (FSD), adapted to Next.js App Router.

## Layers

- `src/app` contains Next.js route adapters, global styles, metadata, and app-wide providers. Route files only import a page slice through its public API and export it as the route component.
- `src/screens` contains the FSD Pages layer: route-level screen composition, with each screen slice exported through its `index.ts`.
- `src/widgets` contains reusable, self-contained UI blocks such as the teacher workspace shell.
- `src/features` contains user actions with business value: create a session, register a demo account, create a team, join a team, and submit a decision.
- `src/entities` contains domain models and read/write operations for sessions and teams.
- `src/shared` contains browser storage helpers and other domain-independent infrastructure.

## Dependency direction

Imports flow down only: `app → screens (FSD Pages) → widgets → features → entities → shared`. A slice may use its own internal modules directly; other slices should import through that slice's `index.ts`. Shared segments expose their own `index.ts` public APIs.

`src/app` route files are intentionally thin because Next.js requires its file-based route convention there. Next.js reserves `src/pages` for its legacy Pages Router, so route-level FSD screen slices live in `src/screens` to avoid accidentally registering extra routes.

## Demo API boundary

Data operations are currently local demo adapters in the owning entity or feature. They use browser storage only and are not an authentication or authorization boundary. Replace those adapters with server API calls when the backend contract is agreed; keep UI imports on the current public APIs.
