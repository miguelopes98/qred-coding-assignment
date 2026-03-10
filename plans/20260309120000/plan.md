# Implementation Plan

## Context

Build a RESTful Node.js + TypeScript API for a Qred corporate card account dashboard. The project template already has Express, Prisma, MySQL (docker-compose), Winston, Mocha/Chai, ESLint, and Prettier. The placeholder `User` model needs to be replaced with the full domain schema. New dependencies (`joi`, `node-cache`, `swagger-ui-express`) must be added.

The API powers a mobile dashboard UI showing card spend, latest transactions, pending invoices, and a card activation action. Architecture: routes → services → db/ (no controllers layer). Three-layer separation, centralized error handling, in-memory caching, Joi validation, and a full OpenAPI 3.0 spec.

---

## Detailed Todo List

### Phase 0 — Dependencies

- [x] Install runtime dependencies: `joi`, `node-cache`, `swagger-ui-express`, `js-yaml`
- [x] Install type dependencies: `@types/node-cache`, `@types/swagger-ui-express`, `@types/js-yaml`

---

### Phase 1 — Prisma Schema + Migration

- [x] Replace placeholder `User` model in `prisma/schema.prisma` with the full domain schema:
  - Models: `Company`, `Employee`, `Card`, `Invoice`, `Transaction`
  - Enums: `CardStatus` (`ACTIVE`, `INACTIVE`, `PENDING`), `InvoiceStatus` (`PAID`, `DUE`), `Market` (8 values)
  - Relations: Company → Employee (1:many), Employee → Card (1:many), Company → Invoice (1:many), Invoice ↔ Card (many:many, implicit Prisma join table), Card → Transaction (1:many)
- [x] Run `npx prisma migrate dev --name init` to create and apply the migration
- [x] Run `npx prisma generate` to regenerate the Prisma client
- [x] Run type-check to confirm Prisma types compile cleanly

---

### Phase 2 — Seed Script

- [x] Write `prisma/seed.ts`:
  - 2 companies: Company A (`Qred AB`), Company B (`Qred OY`)
  - Company A: 2 employees — Anna Svensson (SWEDEN card, INACTIVE) + Erik Lindqvist (FINLAND card, ACTIVE)
  - Company B: 1 employee — Lars Hansen (SWEDEN card, ACTIVE)
  - 1 DUE invoice on Company A linked to both cards
  - 57 transactions on Anna's SWEDEN card (realistic descriptions, categories, amounts in öre)
- [x] Register seed script in `package.json` (`"prisma": { "seed": "ts-node prisma/seed.ts" }`)
- [x] Run `npx prisma db seed` and verify data via `npx prisma studio` or a direct DB query

---

### Phase 3 — Foundation

- [x] Create `src/db/prisma.ts` — singleton `PrismaClient` instance
- [x] Create `src/types/errors.ts` — typed error classes: `NotFoundError`, `ConflictError`, `ValidationError` (each extends `Error`, carries `statusCode` and `code` string)
- [x] Create `src/types/api.types.ts` — shared response interfaces: `CompanyResponse`, `EmployeeResponse`, `CardResponse`, `InvoiceResponse`, `TransactionResponse`, `PaginatedResponse<T>`
- [x] Create `src/cache/client.ts` — `node-cache` instance with a default TTL (e.g. 5 minutes)
- [x] Create `src/cache/keys.ts` — cache key builder functions (e.g. `companyListKey()`, `companyKey(id)`, `cardsByCompanyKey(companyId)`, `cardsByEmployeeKey(employeeId)`, `employeesByCompanyKey(companyId)`, `employeeKey(id)`)
- [x] Create `src/middlewares/errorHandler.ts` — Express error middleware mapping `NotFoundError → 404`, `ConflictError → 409`, `ValidationError → 400`, Prisma `P2025 → 404`, fallback `→ 500`. Response shape: `{ error: { code, message } }`
- [x] Create `src/middlewares/index.ts` — exports `errorHandler` for clean import in `app.ts`
- [x] Wire up `src/app.ts` (or equivalent entry) with the `errorHandler` as the last middleware and a `/v1` router mount point
- [x] Create `swagger.yaml` at project root — OpenAPI 3.0 skeleton (info, servers, empty paths object)
- [x] Add `GET /docs` route serving `swagger-ui-express` from `swagger.yaml`
- [x] Run type-check to confirm foundation compiles

---

### Phase 4 — Endpoints (one at a time)

Each endpoint follows this pattern: db function → service function → route handler + Joi schema → swagger entry → tests.

---

#### 4.1 — GET /v1/companies

- [x] `src/db/company.ts` — `findAllCompanies()`, `findCompanyById(id)`
- [x] `src/services/companies.ts` — `listCompanies()` (cache-aware), `getCompany(id)` (cache-aware, throws `NotFoundError` if missing)
- [x] `src/routes/v1/validation/companies.ts` — Joi schema for `companyId` path param (UUID)
- [x] `src/routes/v1/companies.ts` — `GET /` handler calling `listCompanies()`
- [x] Add `GET /v1/companies` to `swagger.yaml`
- [x] Integration test: `GET /v1/companies` — assert array shape

---

#### 4.2 — GET /v1/companies/:companyId

- [x] `src/routes/v1/companies.ts` — `GET /:companyId` handler with UUID validation, calling `getCompany(id)`
- [x] Add `GET /v1/companies/{companyId}` to `swagger.yaml`
- [x] Integration tests: assert response shape; assert 404 on unknown id; assert 400 on non-UUID param

---

#### 4.3 — GET /v1/companies/:companyId/cards

- [x] `src/db/card.ts` — `findCardsByCompany(companyId)` (join through Employee), `findCardsByEmployee(employeeId)`, `findCardById(id)`
- [x] `src/services/cards.ts` — `getCardsByCompany(companyId)` (cache-aware): compute `remainingSpend = creditLimit - amountSpent`, derive `currency` from `market`; `getCardsByEmployee(employeeId)` (cache-aware)
- [x] Unit tests for `services/cards.ts` — `remainingSpend` computation, `currency` derivation for each market
- [x] `src/routes/v1/companies.ts` — `GET /:companyId/cards` handler
- [x] Add `GET /v1/companies/{companyId}/cards` to `swagger.yaml`
- [x] Integration tests: assert response shape (including `remainingSpend`, `currency`, `employee`); assert empty array when no cards

---

#### 4.4 — GET /v1/companies/:companyId/invoices

- [x] `src/db/invoice.ts` — `findInvoicesByCompany(companyId, status?)` — when `status=DUE`, returns the most recent DUE invoice per market (sort by `createdAt` desc, pick first per market)
- [x] `src/services/invoices.ts` — `getInvoicesByCompany(companyId, status?)`: derive `market` and `currency` from linked cards; throw `NotFoundError` if company doesn't exist
- [x] Unit tests for `services/invoices.ts` — latest-per-market selection logic, multiple markets, no DUE invoices case
- [x] `src/routes/v1/validation/companies.ts` — add Joi schema for `status` query param (`InvoiceStatus` enum)
- [x] `src/routes/v1/companies.ts` — `GET /:companyId/invoices` handler
- [x] Add `GET /v1/companies/{companyId}/invoices` to `swagger.yaml`
- [x] Integration tests: assert latest DUE invoice per market; assert empty array when none; assert 400 on invalid status value

---

#### 4.5 — GET /v1/companies/:companyId/transactions

- [x] `src/db/transaction.ts` — `findTransactionsByCompany(companyId, page, pageSize)` (offset-based, join through Card → Employee → Company), `countTransactionsByCompany(companyId)`, `findAllTransactionsByCompany(companyId)` (for export, no pagination)
- [x] `src/services/transactions.ts` — `getTransactionsByCompany(companyId, page, pageSize)`: returns `{ items, totalCount, page, pageSize }`; derive `currency` from card market per transaction
- [x] Unit tests for `services/transactions.ts` — pagination offset/limit calculation, empty result, page out of bounds
- [x] `src/routes/v1/validation/companies.ts` — add Joi schemas for `page` (positive int) and `pageSize` (positive int, max 100)
- [x] `src/routes/v1/companies.ts` — `GET /:companyId/transactions` handler
- [x] Add `GET /v1/companies/{companyId}/transactions` to `swagger.yaml`
- [x] Integration tests: assert paginated response shape; assert `totalCount = 57` with seed data; assert correct items on page 1 with `pageSize=3`; assert 400 on invalid page

---

#### 4.6 — GET /v1/companies/:companyId/transactions/export

- [x] `src/services/transactions.ts` — `exportTransactionsByCompany(companyId)`: fetch all transactions, format as CSV string (`id,description,amount,date,category,currency`)
- [x] `src/routes/v1/companies.ts` — `GET /:companyId/transactions/export` handler (must be registered **before** `/:companyId/transactions` to avoid Express routing conflict); set `Content-Type: text/csv`, `Content-Disposition: attachment; filename=transactions.csv`
- [x] Add `GET /v1/companies/{companyId}/transactions/export` to `swagger.yaml`
- [x] Integration test: assert `Content-Type: text/csv`; assert CSV headers in response body; assert row count matches total transactions

---

#### 4.7 — GET /v1/companies/:companyId/employees

- [x] `src/db/employee.ts` — `findEmployeesByCompany(companyId)`, `findEmployeeById(id)`
- [x] `src/services/employees.ts` — `getEmployeesByCompany(companyId)` (cache-aware); `getEmployee(id)` (cache-aware, throws `NotFoundError` if missing)
- [x] `src/routes/v1/companies.ts` — `GET /:companyId/employees` handler
- [x] Add `GET /v1/companies/{companyId}/employees` to `swagger.yaml`
- [x] Integration tests: assert employee list shape; assert empty array when no employees

---

#### 4.8 — GET /v1/employees/:employeeId

- [x] `src/routes/v1/validation/employees.ts` — Joi schema for `employeeId` path param (UUID)
- [x] `src/routes/v1/employees.ts` — `GET /:employeeId` handler calling `getEmployee(id)`
- [x] Add `GET /v1/employees/{employeeId}` to `swagger.yaml`
- [x] Integration tests: assert response shape (including `companyId`); assert 404 on unknown id; assert 400 on non-UUID

---

#### 4.9 — GET /v1/employees/:employeeId/cards

- [x] `src/routes/v1/employees.ts` — `GET /:employeeId/cards` handler calling `getCardsByEmployee(employeeId)`
- [x] Add `GET /v1/employees/{employeeId}/cards` to `swagger.yaml`
- [x] Integration tests: assert card list with computed fields (`remainingSpend`, `currency`); assert empty array when no cards

---

#### 4.10 — POST /v1/cards/:cardId/activate

- [x] `src/db/card.ts` — `updateCardStatus(id, status)` — updates card status in DB
- [x] `src/services/cards.ts` — `activateCard(cardId)`: fetch card (throw `NotFoundError` if missing); throw `ConflictError` if status is `ACTIVE` or `PENDING`; update to `ACTIVE`; invalidate card cache for employee and company
- [x] Unit tests for `services/cards.ts` — `INACTIVE → ACTIVE` succeeds; `ACTIVE → activate` throws `ConflictError`; `PENDING → activate` throws `ConflictError`; unknown card throws `NotFoundError`
- [x] `src/routes/v1/validation/cards.ts` — Joi schema for `cardId` path param (UUID)
- [x] `src/routes/v1/cards.ts` — `POST /:cardId/activate` handler
- [x] Add `POST /v1/cards/{cardId}/activate` to `swagger.yaml`
- [x] Integration tests: `INACTIVE → activate` returns updated card with `status: ACTIVE`; second activate returns 409; `PENDING → activate` returns 409; unknown card returns 404; non-UUID returns 400

---

### Phase 5 — Repository-level Integration Tests

- [x] Integration tests for `db/company.ts` — `findAllCompanies`, `findCompanyById` (found + not found)
- [x] Integration tests for `db/employee.ts` — `findEmployeesByCompany`, `findEmployeeById`
- [x] Integration tests for `db/card.ts` — `findCardsByCompany`, `findCardsByEmployee`, `findCardById`
- [x] Integration tests for `db/invoice.ts` — filter by status, latest-per-market ordering
- [x] Integration tests for `db/transaction.ts` — paginated query with correct offset/limit, count, full export fetch

---

## Critical Files

| File                              | Note                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `prisma/schema.prisma`            | Replace placeholder; full domain schema                          |
| `prisma/seed.ts`                  | Realistic demo data; must be runnable standalone                 |
| `src/types/errors.ts`             | Foundation for all error handling                                |
| `src/middlewares/errorHandler.ts` | Must be last middleware in Express chain                         |
| `src/routes/v1/companies.ts`      | Export route must be registered before `:companyId/transactions` |
| `swagger.yaml`                    | Every endpoint added here in step with its implementation        |

## Patterns to Reuse

- Cache pattern: check cache → return if hit → query DB → set cache → return. Invalidate on writes.
- Error pattern: services throw typed errors; routes never catch — let `errorHandler` handle everything.
- Market → currency derivation: one utility function used by both cards and transactions services.
- Computed fields (`remainingSpend`, `currency`) added in service layer, not in DB layer.

---

## Verification

1. `docker-compose up -d` — start MySQL
2. `npx prisma migrate dev` — apply schema
3. `npx prisma db seed` — load seed data
4. `npm run dev` — start server
5. Open `http://localhost:8080/docs` — Swagger UI shows all 10 endpoints
6. Smoke test each endpoint manually via Swagger UI:
   - `GET /v1/companies` — returns 2 companies
   - `GET /v1/companies/:companyId/cards` — returns cards with `remainingSpend` and `currency`
   - `GET /v1/companies/:companyId/invoices?status=DUE` — returns 1 DUE invoice
   - `GET /v1/companies/:companyId/transactions?page=1&pageSize=3` — returns 3 items, `totalCount: 57`
   - `GET /v1/companies/:companyId/transactions/export` — downloads CSV
   - `POST /v1/cards/:cardId/activate` on INACTIVE card — returns `status: ACTIVE`
   - Repeat activate — returns 409
7. `npm test` — all unit tests pass
8. `npm run test:integration` — all integration tests pass (with Docker running)
