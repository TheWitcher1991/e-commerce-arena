# E-Commerce Arena

Веб-приложение для проведения учебной симуляции электронной коммерции. Проект состоит из интерфейса на Next.js, API на FastAPI и PostgreSQL. Продуктовые требования и дизайн находятся в [документации](./docs/E-Commerce_Arena_Продуктовая_и_техническая_документация.docx) и [DESIGN.md](./DESIGN.md).

## Состояние проекта

- `frontend/` — Next.js 16, React 19, TypeScript, TanStack Query, Tailwind CSS v4; структура FSD.
- `backend/` — FastAPI, SQLAlchemy 2, PostgreSQL, Alembic; роли преподавателя и лидера, участники по приглашению, игровые раунды, результаты и экспорт.
- `docker-compose.yml` — локальная инфраструктура для frontend, API и PostgreSQL; миграция БД вынесена в отдельный сервис.

Реализован основной учебный сценарий без репетиционного режима: регистрация и вход, занятия преподавателя, приглашение четырёх лидеров и участников, управление тремя раундами с паузой и кризисом во втором раунде, расчёт и публикация результатов, оценивание, аудит, экран аудитории, карточка защиты и CSV-экспорт. Frontend обращается к FastAPI; access token хранится в `sessionStorage` и ограничен сессией вкладки. Для production потребуется отдельная проверка развёртывания, HTTPS, политики хранения токенов, резервного копирования и эксплуатационного мониторинга.

## Требования

- Node.js 20.9+ и pnpm 10.32.1+
- Python 3.12+
- PostgreSQL 15+ для локального запуска backend
- Docker Engine и Docker Compose v2 для контейнерного запуска

## Frontend локально

```bash
cd frontend
pnpm install
pnpm dev
```

Откройте `http://localhost:3000`. Полный перечень маршрутов и FSD-соглашения — в [frontend/README.md](./frontend/README.md) и [frontend/ARCHITECTURE.md](./frontend/ARCHITECTURE.md).

## Backend локально

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

Замените `JWT_SECRET_KEY` в `backend/.env`, настройте `DATABASE_URL`, затем при работающей PostgreSQL примените миграции и запустите API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API доступен на `http://localhost:8000`, документация — `/docs`. Детали API, миграций и ролей описаны в [backend/README.md](./backend/README.md).

## Docker Compose

Для Compose скопируйте корневой `.env.example` в `.env`, установите уникальные секреты и следуйте [DOCKER.md](./DOCKER.md). Пример команд запуска:

```bash
docker compose --profile tools run --build --rm migrate
docker compose up --build -d
```

Compose публикует порты только на localhost. Команды приведены для пользователя; при работе с проектом не запускайте контейнеры, API или базу без явной необходимости.

## Проверки

```bash
cd frontend && pnpm lint
cd backend && ruff check app alembic
```

Не запускайте тесты, сборки, сервисы или миграции к реальной БД без явного запроса. Перед проверками сначала убедитесь, что зависимости установлены и целевая среда не будет затронута.
