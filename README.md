# template-ts-semantic-release

A personal TypeScript project template with the following already set up:

- TypeScript
- Nodemon
- Semantic releases
- Pre-commit hooks using Husky
- GitHub Actions CI (type-check, lint, format, unit tests, integration tests)
- Prettier
- Dockerfile (multi-stage)
- ESLint
- Winston logger
- Prisma ORM with MySQL
- Unit tests
- Integration tests (MySQL via Docker)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Docker](https://www.docker.com/) (for running the app and integration tests)

### Option A: Docker with live reload (recommended for development)

Runs nodemon inside Docker with `src/` and `config/` mounted from your machine. The container restarts automatically on every file save — no rebuild needed. This is the fastest feedback loop during development.

A MySQL container is started alongside the app. Prisma migrations run automatically on startup.

```bash
npm install                    # install dependencies and set up git hooks
npm run start:dev:docker:build # build the dev image and start the app + db
```

The app will be available at `http://localhost:8080`.

On subsequent runs:

```bash
npm run start:dev:docker  # start using the existing dev image (no rebuild)
```

Only run `npm run start:dev:docker:build` again after changing `package.json`, `tsconfig.json`, or `prisma/schema.prisma`.

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
