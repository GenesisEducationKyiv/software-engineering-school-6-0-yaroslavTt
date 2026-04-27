# GitHub Release Notification API

A monolithic Node.js/Express service that lets users subscribe to email notifications for new GitHub repository releases.

## Architecture

The service has three internal components running in a single process:

- **API** — REST endpoints for managing subscriptions (Express)
- **Scanner** — cron job that polls GitHub for new releases every 5 minutes
- **Notifier** — sends transactional emails via SMTP (nodemailer)

### Subscription flow

1. `POST /api/subscribe` — validates the repo exists on GitHub, inserts an unconfirmed subscription, sends a confirmation email with a unique token link
2. `GET /api/confirm/:token` — activates the subscription; only confirmed subscriptions receive release emails
3. Scanner detects a new release → sends notification email with a one-click unsubscribe link
4. `GET /api/unsubscribe/:token` — deletes the subscription

### Scanner logic

- Runs on a configurable cron schedule (default: every 5 minutes)
- Processes only confirmed subscriptions
- Stores `last_seen_tag` per repository. On first scan after subscribe, records the current latest tag **without sending an email** (bootstrap protection — prevents flooding new subscribers with old releases)
- On GitHub 429 (rate limit), logs the retry time and aborts the current tick to preserve remaining quota

### Redis caching

GitHub API responses are cached in Redis with a 10-minute TTL:
- `gh:repo:{owner}:{repo}` — repository existence check
- `gh:release:{owner}:{repo}` — latest release data

Redis is a **soft dependency**: if it's unavailable, the service continues without caching (no crashes, just live GitHub calls).

### Rate limiting

- Without a `GITHUB_TOKEN`: 60 requests/hour
- With a `GITHUB_TOKEN`: 5000 requests/hour (recommended for production)

## API

Full documentation available at `GET /docs` (Swagger UI) once the service is running.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscribe` | Subscribe email to repo releases |
| GET | `/api/confirm/:token` | Confirm subscription via email link |
| GET | `/api/unsubscribe/:token` | Unsubscribe via email link |
| GET | `/api/subscriptions?email=` | List confirmed subscriptions for an email |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

## Running with Docker

```bash
cp .env.example .env
# Edit .env with your SMTP credentials and optionally GITHUB_TOKEN
docker-compose up --build
```

The service will be available at `http://localhost:3000`.

## Running locally

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL to a local Postgres instance
npm install
npm run dev
```

## Running tests

```bash
# Unit tests only (no external services needed)
npm run test:unit

# All tests (requires Postgres + Redis)
DATABASE_URL=postgresql://... REDIS_URL=redis://... npm test
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `GITHUB_TOKEN` | — | GitHub personal access token (raises rate limit to 5000/hr) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_TTL` | `600` | Cache TTL in seconds |
| `SMTP_HOST` | — | SMTP server host |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `EMAIL_FROM` | — | Sender address |
| `APP_BASE_URL` | `http://localhost:3000` | Used to build confirm/unsubscribe links in emails |
| `CRON_SCHEDULE` | `*/5 * * * *` | Cron expression for scanner interval |
| `API_KEY` | — | If set, all write endpoints require `X-API-Key` header |
