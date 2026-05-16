# Testing

## Unit

No external dependencies required.

```bash
npm run test:unit
```

## Integration

Uses [Testcontainers](https://testcontainers.com/) — Docker must be running.

```bash
npm run test:integration
```

## E2E

Spins up the full stack via Docker Compose, runs Playwright tests, then tears down.

```bash
npm run test:e2e
```

> Requires Docker. Set `GITHUB_TOKEN` env var if tests hit the GitHub API.

## All (unit + integration)

```bash
npm test
```

With coverage:

```bash
npm run test:cov
```
