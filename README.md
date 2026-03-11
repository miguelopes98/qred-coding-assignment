# Qred Coding Assignment

A REST API built with Node.js and TypeScript, exposing company, employee, card, invoice, and transaction data for Qred's card product.

- TypeScript + Express REST API
- Swagger/OpenAPI documentation (`/docs`)
- In-memory caching with cache-aside pattern (node-cache)
- Request validation middleware (Joi)
- Typed error handling with structured error responses
- Prisma ORM with MySQL
- Nodemon with Docker for live reload development
- Dockerfile (multi-stage)
- Semantic releases
- Pre-commit hooks (Husky)
- GitHub Actions CI (type-check, lint, format, unit tests, integration tests)
- Prettier + ESLint
- Winston logger
- Unit tests + Integration tests (MySQL via Docker)

## AI-assisted development workflow

This project was developed using [Claude Code](https://claude.ai/claude-code) (Anthropic) as an AI pair programmer. The workflow is structured and deliberate — Claude does not run free. Every architectural decision was driven through conversation, with proposals challenged and redirected where needed. Claude was used to pressure-test reasoning, draft structures, and capture decisions; the engineering judgement stayed with the developer throughout.

### The `plans/` folder

The `plans/` folder is an artifact of this workflow. Each planning session produces a timestamped subfolder (`plans/YYYYMMDDHHmmss/`) containing:

| File          | Purpose                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `research.md` | Findings from the research phase — domain model, API design, architecture decisions, test strategy, seed data plan |
| `plan.md`     | The implementation plan — a checkbox todo list of every task, with context and a verification section              |

These files are generated before any code is written. They serve as a contract between the planning phase and the implementation phase, and as a record of the reasoning behind decisions.

The workflow has four phases:

1. **Research** — explore the codebase, the domain, and the requirements. All findings go into `research.md`.
2. **Planning** — translate the research into a concrete, step-by-step implementation plan in `plan.md`. No code is written until the plan is agreed.
3. **Implementation** — execute the plan task by task, checking off items as they are completed.
4. **Cleanup** — optionally delete the `plans/` folder once the work is merged.

The [`thoughts.md`](thoughts.md) file at the project root is a separate artefact — it captures the design decisions and tradeoffs made during the assignment. For anyone reviewing the implementation, this is the best starting point for understanding the reasoning behind the data model, API design, caching strategy, and payload design choices.

## Getting started

### Prerequisites

- [Docker](https://www.docker.com/) — required to run the app and integration tests
- [Node.js](https://nodejs.org/) >= 22 — only needed if you want to run tooling locally (tests, lint, type-check, Prisma CLI). Not required to run the app itself.

### Option A: Docker with live reload (recommended for development)

Runs nodemon inside Docker with `src/` and `config/` mounted from your machine. The container restarts automatically on every file save — no rebuild needed. This is the fastest feedback loop during development.

A MySQL container is started alongside the app. Prisma migrations run automatically on startup.

```bash
npm install             # install dependencies and set up git hooks
npm run start:dev:build # build the dev image and start the app + db
```

The app will be available at `http://localhost:8080`. Swagger docs at `http://localhost:8080/docs`.

On subsequent runs:

```bash
npm run start:dev  # start using the existing dev image (no rebuild)
```

Only run `npm run start:dev:build` again after changing `package.json`, `tsconfig.json`, or `prisma/schema.prisma`.

### Option B: Production image

Compiles TypeScript and runs the built output. Use this to test the production build locally. A MySQL container is started alongside the app and Prisma migrations run automatically on startup.

```bash
npm install          # install dependencies and set up git hooks
npm run start:build  # build the Docker image and start the app + db
```

On subsequent runs:

```bash
npm start  # start using the existing image (no rebuild)
```

Run `npm run start:build` again after any code changes.

## Database (Prisma + MySQL)

The project uses [Prisma](https://www.prisma.io/) as the ORM with a MySQL database.

### Schema

The schema lives in `prisma/schema.prisma`. After modifying it, create a new migration:

```bash
npx prisma migrate dev --name describe-your-change
```

This generates the migration SQL in `prisma/migrations/` and applies it to the local database.

### Migrations in Docker

Migrations run automatically on container startup (`prisma migrate deploy`). No manual step needed after `start:dev:docker:build`.

### Integration test database

The integration test suite uses its own isolated MySQL container defined in `tests/integration/docker-compose.yml`. Copy the relevant example env files before running:

```bash
cp tests/integration/.env.test-local.example tests/integration/.env.test-local
cp tests/integration/.env.test-ci.example tests/integration/.env.test-ci
```

## Testing

To run unit tests:

```bash
npm test
```

> Note: `chai` is pinned to v4 — upgrading to v5 will break tests due to lack of CommonJS support.

### Integration tests

You need to have `docker-compose` installed to run integration tests locally.

```bash
npm run test:integration:local
```

This will spin up the Docker environment, wait for readiness, run the tests, and tear everything down.

## Manual testing with curl

Once the app is running at `http://localhost:8080`, use the following commands to exercise every endpoint.

The seed data includes one company with a known ID — you can use it directly in steps 2–12 without running step 1 first:

```
8c46277f-155f-48f4-83aa-274d58a72f4a
```

### 1. List all companies

```bash
curl http://localhost:8080/v1/companies
```

### 2. Get a single company

```bash
curl http://localhost:8080/v1/companies/<companyId>
```

### 3. Get employees for a company

```bash
curl http://localhost:8080/v1/companies/<companyId>/employees
```

### 4. Get a single employee

```bash
curl http://localhost:8080/v1/employees/<employeeId>
```

### 5. Get cards for a company

```bash
curl http://localhost:8080/v1/companies/<companyId>/cards
```

### 6. Get cards for an employee

```bash
curl http://localhost:8080/v1/employees/<employeeId>/cards
```

### 7. Activate a card

Anna's card is seeded as `INACTIVE` — use its ID from step 5.

```bash
curl -X POST http://localhost:8080/v1/cards/<cardId>/activate
```

### 8. Try to activate the same card again — expect 409

```bash
curl -X POST http://localhost:8080/v1/cards/<cardId>/activate
```

### 9. Get all invoices for a company

```bash
curl http://localhost:8080/v1/companies/<companyId>/invoices
```

### 10. Get invoices filtered by status

```bash
curl "http://localhost:8080/v1/companies/<companyId>/invoices?status=DUE"
```

### 11. Get paginated transactions

```bash
curl "http://localhost:8080/v1/companies/<companyId>/transactions?page=1&pageSize=10"
```

### 12. Export transactions as CSV

```bash
curl http://localhost:8080/v1/companies/<companyId>/transactions/export
```

### 13. Trigger a validation error (invalid UUID)

```bash
curl http://localhost:8080/v1/companies/not-a-uuid
```

### 14. Trigger a not found error

```bash
curl http://localhost:8080/v1/employees/00000000-0000-0000-0000-000000000000
```

## GitHub Actions

The CI pipeline runs on every push to `master` and on pull requests. It includes:

- TypeScript build check
- Prettier format check
- ESLint lint check
- Unit tests
- Integration tests (MySQL service container)

### Secrets required

| Secret             | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `GH_RELEASE_TOKEN` | GitHub PAT used by semantic-release to create releases |

## Semantic Release

Releases are triggered automatically on push to `master` via the `release.yml` workflow. Versioning follows [Conventional Commits](https://www.conventionalcommits.org/).
