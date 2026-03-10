# Research Findings

## Project Overview

A TypeScript + Express.js + Prisma + MySQL project template. Already set up with:

- Express server on port 8080
- Prisma ORM with MySQL (docker-compose spins up MySQL 8)
- Winston logging
- Mocha/Chai unit and integration tests
- ESLint + Prettier
- Husky pre-commit hooks
- Docker (dev + prod Dockerfiles, docker-compose files)

The existing schema.prisma has a placeholder `User` model only — needs to be replaced.
`joi` needs to be added as a dependency (not currently in package.json).

---

## UI Analysis (Appendix 1)

The mobile view is a **card account dashboard** for a business owner. It contains these sections:

| Section                   | Data required                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Company selector dropdown | List of companies the user is associated with; currently selected company name      |
| Invoice due badge         | Whether there is a pending invoice due; if so, its ID to navigate to it             |
| Card image                | A URL or identifier for the card image                                              |
| Remaining spend           | `amountSpent`, `creditLimit`, currency (derived from card market)                   |
| Latest transactions       | 3 most recent transactions with description + metadata; total transaction count     |
| Activate card button      | Card status (`ACTIVE` / `INACTIVE`) — button only shown/enabled if card is inactive |
| Contact support           | Static UI, no API needed                                                            |

---

## Domain Model

### Entities

**Company**

- Represents a business registered with Qred
- Has many employees
- Owns invoices (billing entity)

**Employee**

- A person associated with a company
- Every card must be issued to an employee — no company-level cards without an owner

**Card**

- A credit card issued to an employee
- Carries its own `market` (determines currency) — a company can have cards in multiple markets via its employees
- Amounts stored in the smallest currency unit (öre for SEK, cents for EUR, etc.)
- Has a status: `ACTIVE` | `INACTIVE` | `PENDING`
- Has a card image URL

**Invoice**

- A billing document owned by a Company (one-to-many: Company → Invoice)
- Linked to one or more Cards (many-to-many: Invoice ↔ Card)
- Status: `PAID` | `DUE`
- Dashboard shows the most recent DUE invoice per market

**Transaction**

- A spending event on a specific Card
- Has a description, amount (smallest currency unit), date, and category

### Relationships

```
Company (1) ──< Employee (many)
Employee (1) ──< Card (many, each with its own Market)
                 Card ──< Transaction (many)
Company (1) ──< Invoice (many)
Invoice (many) >──< Card (many)   ← implicit Prisma join table
```

---

## API Design

### Guiding principle

RESTful approach: one endpoint per resource identity. Each UI section fetches its own data independently, enabling component-level caching and parallel requests. The tradeoffs vs. a single BFF endpoint will be covered in the presentation.

### Endpoints

#### 1. List companies

```
GET /v1/companies
```

Returns all companies (in a real system, scoped to the authenticated user).

**Response:**

```json
[
  { "id": "uuid", "name": "Company AB" },
  { "id": "uuid", "name": "Company XYZ" }
]
```

#### 2. Get company

```
GET /v1/companies/:companyId
```

**Validation:** `companyId` must be a valid UUID.

**Response:**

```json
{ "id": "uuid", "name": "Company AB" }
```

#### 3. List cards for company

```
GET /v1/companies/:companyId/cards
```

Returns all cards for all employees of the company. Each card includes its market, derived currency, and the employee it belongs to. Returns an empty array if no cards exist.

**Validation:** `companyId` must be a valid UUID.

**Response:**

```json
[
  {
    "id": "uuid",
    "status": "INACTIVE",
    "market": "SWEDEN",
    "currency": "SEK",
    "creditLimit": 1000000,
    "amountSpent": 540000,
    "remainingSpend": 460000,
    "employee": { "id": "uuid", "name": "Anna Svensson" }
  }
]
```

Note: amounts are in the smallest currency unit (öre for SEK, cents for EUR).

#### 4. Get invoices for company

```
GET /v1/companies/:companyId/invoices?status=DUE
```

Returns the most recent DUE invoice per market when `status=DUE`. Returns an empty array if none exist.

**Validation:** `companyId` UUID; `status` must be a valid `InvoiceStatus` value.

**Response:**

```json
[
  {
    "id": "uuid",
    "amount": 120000,
    "dueDate": "2026-03-15",
    "status": "DUE",
    "market": "SWEDEN",
    "currency": "SEK"
  }
]
```

#### 5. Get transactions for company (paginated)

```
GET /v1/companies/:companyId/transactions?page=1&pageSize=3
```

Paginated list of all transactions across all cards of all company employees. The dashboard shows the first page with `pageSize=3`. The "54 more items" CTA navigates to the full transaction view, which continues paginating.

**Validation:** `companyId` UUID; `page` positive integer; `pageSize` positive integer (max 100).

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "description": "Office supplies",
      "amount": 45000,
      "date": "2026-03-08",
      "category": "Office",
      "currency": "SEK"
    }
  ],
  "totalCount": 57,
  "page": 1,
  "pageSize": 3
}
```

#### 6. Export transactions for company

```
GET /v1/companies/:companyId/transactions/export
```

Returns a CSV file of all transactions for the company. No pagination — full export.

**Validation:** `companyId` UUID.

**Response:** `Content-Type: text/csv`

#### 7. List employees for company

```
GET /v1/companies/:companyId/employees
```

Returns all employees belonging to a company.

**Validation:** `companyId` UUID.

**Response:**

```json
[
  { "id": "uuid", "name": "Anna Svensson", "email": "anna@companyab.se" },
  { "id": "uuid", "name": "Erik Lindqvist", "email": "erik@companyab.se" }
]
```

#### 8. Get employee details

```
GET /v1/employees/:employeeId
```

Returns details for a specific employee.

**Validation:** `employeeId` UUID.

**Response:**

```json
{ "id": "uuid", "name": "Anna Svensson", "email": "anna@companyab.se", "companyId": "uuid" }
```

#### 9. List cards for employee

```
GET /v1/employees/:employeeId/cards
```

Returns all cards issued to a specific employee.

**Validation:** `employeeId` UUID.

**Response:**

```json
[
  {
    "id": "uuid",
    "status": "ACTIVE",
    "market": "SWEDEN",
    "currency": "SEK",
    "creditLimit": 1000000,
    "amountSpent": 540000,
    "remainingSpend": 460000
  }
]
```

#### 10. Activate card

```
POST /v1/cards/:cardId/activate
```

Activates a card. Returns the updated card. Returns `409` if card is already `ACTIVE` or `PENDING`.

**Validation:** `cardId` must be a valid UUID.

---

## Database Schema (Prisma)

```prisma
model Company {
  id        String     @id @default(uuid())
  name      String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  employees Employee[]
  invoices  Invoice[]
}

model Employee {
  id        String   @id @default(uuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  name      String
  email     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cards     Card[]
}

model Card {
  id           String        @id @default(uuid())
  employeeId   String
  employee     Employee      @relation(fields: [employeeId], references: [id])
  status       CardStatus    @default(INACTIVE)
  market       Market
  creditLimit  Int
  amountSpent  Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  invoices     Invoice[]
  transactions Transaction[]
}

model Invoice {
  id        String        @id @default(uuid())
  companyId String
  company   Company       @relation(fields: [companyId], references: [id])
  amount    Int
  dueDate   DateTime
  status    InvoiceStatus @default(DUE)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  cards     Card[]
}

model Transaction {
  id          String   @id @default(uuid())
  cardId      String
  card        Card     @relation(fields: [cardId], references: [id])
  description String
  amount      Int
  date        DateTime
  category    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum CardStatus {
  ACTIVE
  INACTIVE
  PENDING
}

enum InvoiceStatus {
  PAID
  DUE
}

enum Market {
  SWEDEN
  FINLAND
  DENMARK
  NORWAY
  NETHERLANDS
  BELGIUM
  GERMANY
  BRAZIL
}
```

---

## Architecture

Three layers: routes → services → repositories. Routes own HTTP concerns (param extraction, validation, response mapping). No controllers layer.

```
src/
  routes/v1/
    companies.ts              ← Parse req, validate, call service, send res
    employees.ts
    cards.ts
    validation/
      companies.ts            ← Joi schemas for company route params/query
      employees.ts            ← Joi schemas for employee route params
      cards.ts                ← Joi schemas for card route params
  services/
    companies.ts              ← Business logic
    employees.ts
    cards.ts
    transactions.ts
    invoices.ts
  middlewares/
    errorHandler.ts           ← Centralized Express error handler
    index.ts
  cache/
    client.ts                 ← In-memory cache client (node-cache), TTL-based
    keys.ts                   ← Cache key constants
  db/
    prisma.ts                 ← Singleton PrismaClient instance
    company.ts
    card.ts
    employee.ts
    invoice.ts
    transaction.ts
  types/
    api.types.ts              ← Shared response type interfaces
    errors.ts                 ← Typed error classes (NotFoundError, ConflictError, etc.)
swagger.yaml                  ← OpenAPI 3.0 spec (project root)
```

**Validation with Joi:** Each route file imports its Joi schema from `validation/` and validates before calling the service. Invalid requests return `400` with a descriptive message. Validated fields:

- Path params: `companyId`, `cardId`, `employeeId` — UUID format
- Query params: `status` (valid `InvoiceStatus`), `page` (positive int), `pageSize` (positive int, max 100)

**Centralized error handling:** A single Express error middleware in `middlewares/errorHandler.ts` catches all errors and maps them to a consistent JSON response shape:

```json
{ "error": { "code": "NOT_FOUND", "message": "Company not found" } }
```

Typed error classes (`NotFoundError`, `ConflictError`, `ValidationError`) are thrown from services and routes. The handler maps each to the correct HTTP status code. Prisma's `P2025` (record not found) is caught here and mapped to 404. Unhandled errors return 500 without leaking stack traces.

**OpenAPI spec (`swagger.yaml`):** A complete OpenAPI 3.0 spec documenting all endpoints, request params, and response shapes. Enables frontend developers to mock the API immediately and work in parallel — directly addressing Task 1 of the assignment. Served via `GET /docs` using `swagger-ui-express`.

**Caching (`cache/`):** Services check the cache before querying the DB. Cache uses `node-cache` (in-memory, TTL-based) for the assignment. Cached resources: company list, individual companies, employee lists, card lists per company/employee. Cache is invalidated on writes — e.g. activating a card invalidates the card cache for that employee and company. TTL prevents unbounded growth.

**Why repositories in `db/`?** All database-touching code is co-located with the Prisma client. Services stub repositories in unit tests — no Prisma mocking needed.

---

## Test Strategy

**Unit tests** (no DB, stub repositories with sinon):

- `services/cards.ts` — compute `remainingSpend`, derive `currency` from market, activate logic (INACTIVE → ACTIVE, ACTIVE → 409, PENDING → 409)
- `services/transactions.ts` — pagination logic, edge cases (empty list, page out of bounds)
- `services/invoices.ts` — latest DUE invoice per market logic

**Integration tests** (real DB via docker-compose) — two levels:

_Repository-level_ (test DB functions directly, no HTTP):

- `db/employee.ts` — find by company, find by id
- `db/card.ts` — find by company (join through employee), find by employee, find by id
- `db/invoice.ts` — filter by status, latest per market
- `db/transaction.ts` — paginated query, count, full export fetch

_Endpoint-level_ (HTTP via supertest):

- `GET /v1/companies` — assert list
- `GET /v1/companies/:companyId/cards` — assert response shape and computed fields
- `GET /v1/companies/:companyId/employees` — assert list
- `GET /v1/companies/:companyId/invoices?status=DUE` — assert latest per market
- `GET /v1/companies/:companyId/transactions?page=1&pageSize=3` — assert pagination
- `GET /v1/companies/:companyId/transactions/export` — assert CSV output
- `GET /v1/employees/:employeeId` — assert employee details
- `GET /v1/employees/:employeeId/cards` — assert card list with computed fields
- `POST /v1/cards/:cardId/activate` — assert status transitions and 409 on double-activate
- Validation error cases — assert 400 on bad UUID, invalid status, out-of-range page

---

## Seed Data

A seed script will insert realistic data so the demo works out of the box:

- 2 companies
- Company A: 2 employees, each with 1 card — one `ACTIVE` (SWEDEN/SEK), one `INACTIVE` (FINLAND/EUR)
- Company B: 1 employee with 1 `ACTIVE` card (SWEDEN/SEK)
- 1 outstanding (`DUE`) invoice on Company A linked to both cards
- 57 transactions on Company A's Swedish card (so the "54 more items" count is realistic)
