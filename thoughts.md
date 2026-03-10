## Working with AI tooling

This assignment was developed in collaboration with Claude (Anthropic), used as an AI pair programmer throughout the design, planning and implementation phases. The workflow was deliberately hands-on: I drove every architectural decision through conversation, challenged proposals, redirected approaches that didn't fit (e.g. moving market from Company to Card, removing the controllers layer, dropping file name suffixes, restructuring the invoice relationship), and used Claude to pressure-test reasoning and capture decisions.

Claude did not run free. It proposed options; I chose directions. It drafted structures; I refined them through iteration. The goal was to use AI tooling the way a senior engineer would — as a fast, knowledgeable collaborator, not as a replacement for engineering judgement.

The `thoughts.md` file itself was built incrementally through that conversation, with decisions added as they were made rather than written up after the fact.

---

## RESTful design vs. BFF aggregation

**Decision:** One endpoint per resource identity (RESTful), not a single aggregated endpoint (BFF).

**Reasoning:** A BFF endpoint that aggregates all dashboard data into one call would be a valid optimisation, but it couples the backend shape tightly to one specific UI layout. The RESTful approach lets each UI component fetch its own data independently, which fits a component-driven frontend well and keeps the API more reusable.

**Performance tradeoff:** Multiple requests in parallel are acceptable when responses are cached. Since the data per card doesn't change frequently, cache hit rates should be high and the cost of separate requests is low.

**When to revisit:** If caching is not viable (e.g. high data churn, low request repetition), a BFF or internal aggregation layer becomes the right call — combining the separate resource fetches into one endpoint without changing the underlying service logic.

## Market placement: on Card, not Company

**Decision:** `market` is an enum field on `Card`, not on `Company`.

**Reasoning:** A company can operate across multiple markets — e.g. a Nordic business might hold a Swedish card (SEK) and a Finnish card (EUR) simultaneously. Placing market on Company would enforce a single market per company, which is too restrictive for a cross-border fintech like Qred.

By placing market on Card:

- Each card carries its own market context and implied currency
- A company can have cards across multiple markets naturally
- Transactions on a card are implicitly in that card's market currency
- Invoices (linked to cards via many-to-many) are also implicitly market-aware

**Consequence:** `currency` is not stored on Card. It is derived from the card's market in the service layer (e.g. `SWEDEN → SEK`, `FINLAND → EUR`, `DENMARK → DKK`). As a consequence, the amounts will always be stored in the smallest unit for the given currency. With cents (for EUR) and öre (for SEK) for example being the decimals.

**When to revisit:** If market-level configuration (credit limit rules, card network, regulatory settings) grows complex, graduate `Market` from an enum to a separate entity with its own table.

## Caching: in-memory for the assignment, Redis in production

**Decision:** Using `node-cache` (in-memory, TTL-based) for caching in this assignment.

**Why not Redis here:** Redis would be the correct production choice, but requires an additional service to run locally. For the purposes of a demo, in-memory is sufficient.

**Why Redis in production:**

- In-memory cache is process-scoped. In a horizontally scaled deployment (multiple Node.js instances behind a load balancer), each instance maintains its own cache. This causes inconsistent responses across instances and wastes memory redundantly.
- Redis is a shared external cache — all instances read from and write to the same store, ensuring consistency.

**The unbounded memory growth risk:** In-memory caching without a TTL or eviction policy will cause the cache to grow indefinitely, consuming more memory until the process exhausts its heap. This is not a "memory leak" in the strict sense (a leak is memory that is allocated but can never be freed because all references to it are lost). It is **unbounded memory growth** — the cache holds valid references, so the GC won't collect them. The fix is always setting a TTL and/or a max cache size with an eviction policy (LRU is most common). `node-cache` supports TTL out of the box.

## Storing amounts in the smallest currency unit

**Decision:** All monetary amounts (creditLimit, amountSpent, invoice amount, transaction amount) are stored as integers in the smallest currency unit — öre for SEK, cents for EUR, etc.

**Reasoning:** Floating point numbers cannot represent decimal values exactly in binary. Storing `100.50 SEK` as a float risks rounding errors that compound across calculations. Storing `10050` (öre) as an integer is exact. The service layer is responsible for converting to a human-readable format when building the API response (e.g. `10050 → 100.50 SEK`).

## Invoice ownership: Company (billing) + Card (spend coverage)

**Decision:** Invoice belongs to Company via a one-to-many relation, and is linked to one or more Cards via a many-to-many relation.

**Reasoning:** The invoice is a billing document sent to the Company as the legal/financial entity — so Company is the natural owner. But an invoice aggregates spending across one or more cards (e.g. a company with 3 cards gets one monthly invoice covering all of them). The many-to-many link to Card captures exactly which cards' spend is reflected in a given invoice, without duplicating the billing ownership onto the card.

## Every card must have an employee owner

**Decision:** Card belongs to Employee (mandatory). There are no company-level cards without an assigned employee.

**Reasoning:** In a corporate card product, every card is issued to a person. This enforces accountability — spend is always attributable to an individual. It also makes the data model more honest: a card without an owner would be an exceptional state that shouldn't exist in the normal lifecycle.

**Consequence:** To query all cards for a company, you join through Employee (`Card → Employee → Company`). This is a two-level join but Prisma handles it cleanly and avoids denormalizing `companyId` onto Card.

## No denormalization on Transaction

**Decision:** Transaction only holds `cardId`. It does not store `companyId` directly, even though it would make `GET /v1/companies/:companyId/transactions` queries faster.

**Reasoning:** Denormalizing `companyId` onto Transaction would create a second source of truth — if a card were ever transferred between employees or companies, the denormalized field could become stale and inconsistent. The join through Card is a single level and adds negligible cost at this scale. If query performance became a real concern at scale, a database index or a materialized view would be the right solution, not denormalization.

## Pagination: offset-based, not cursor-based

**Decision:** Pagination uses `page` + `pageSize` (offset-based), not a cursor.

**Reasoning:** Offset pagination is simpler to implement, easier for the frontend to reason about (e.g. "go to page 3"), and sufficient for this use case. The "54 more items" CTA in the UI navigates to the next page of results — it does not require cursor-based pagination.

**When to revisit:** Cursor-based pagination is preferable for very large datasets or real-time feeds where rows are frequently inserted (offset pagination can skip or repeat rows if the dataset changes between requests). For a transaction history view, where data is mostly append-only and the user scrolls through pages, offset pagination is a reasonable choice.

## OpenAPI spec as the enabler of parallel frontend/backend work

**Decision:** A complete `swagger.yaml` (OpenAPI 3.0) is included and served at `GET /docs`.

**Reasoning:** This directly addresses Task 1 of the assignment. The spec is a contract: frontend developers can mock the API against the spec on day one, before a single endpoint is implemented. Backend can evolve the implementation against the same contract. Changes to the contract are visible, reviewable, and discussable in a pull request before any code is written. This is the most impactful single thing you can do to unblock parallel frontend/backend work.

## Scope of endpoints: purposeful, not exhaustive

**Decision:** The API implements the endpoints needed to power the card account dashboard UI, plus a small set of supporting endpoints (employee details, employee cards, company employees). It does not implement card deactivation, card creation, employee creation, company management, or other CRUD operations.

**Reasoning:** This is a focused assignment demonstrating the quality and maturity of the engineering on a representative slice of the product — not a full product build. Adding more endpoints (deactivate card, update employee, create company, etc.) would not reveal anything new about the engineering approach; it would just be more of the same. The activate-card endpoint was included because it demonstrates a meaningful state transition with business rules (INACTIVE → ACTIVE, conflict on ACTIVE/PENDING). Further management endpoints would be straightforward to add following the same patterns already established.

**What a production API would add:** Full CRUD for cards (create, deactivate, replace), employee management (create, update, offboard), company onboarding endpoints, and admin/ops endpoints for support workflows.

## Centralized error handling + typed error classes

**Decision:** All errors flow through a single Express error middleware. Services throw typed error classes (`NotFoundError`, `ConflictError`, `ValidationError`) rather than raw `Error` objects or returning null.

**Reasoning:** Without this, each route handler would need its own try/catch and its own logic for mapping errors to HTTP status codes — duplicated across every endpoint. Centralizing it means: one place to change error response shape, one place to handle Prisma-specific errors (e.g. `P2025` record not found → 404), and no risk of accidentally leaking stack traces to the client in production. Typed error classes make the intent explicit at the throw site and make the handler's mapping logic straightforward.

## Cache invalidation must cover all affected keys

**Decision:** `activateCard` invalidates both `cardsByEmployeeKey(employeeId)` and `cardsByCompanyKey(companyId)`.

**Reasoning:** The initial implementation only invalidated the employee-scoped key. But `getCardsByCompany` has its own cache keyed by `companyId` — after activation, that cache would still hold the card with `status: INACTIVE` until TTL expiry. Any call to `GET /v1/companies/:companyId/cards` would return stale data.

**Rule of thumb:** When a write mutates a resource, identify every cache key that could serve stale representations of that resource and invalidate all of them — not just the most obvious one.

## DB queries should include the relations needed for the operation, not just the happy path

**Decision:** `findCardById` includes `{ employee: true }` even though most callers only need the bare card fields.

**Reasoning:** `activateCard` needs `employee.companyId` to invalidate the company-scoped cache. The naive fix was a second `findEmployeeById` call — but that is an extra round-trip whose sole purpose is supporting cache housekeeping, not business logic. Including the employee in the original fetch removes that entirely. The cost is a slightly heavier join on every `findCardById` call; the benefit is one fewer DB round-trip on `activateCard` and no coupling between the service layer and the employee DB module for a non-employee operation.

**When to revisit:** If `findCardById` is called in a hot path where the employee data is never needed, a separate lean variant (e.g. `findCardByIdWithEmployee`) would let callers opt in to the join only when required.

## Request validation middleware over inline validation

**Decision:** All route handlers use `requestValidatorMiddleware({ params, query, body })` rather than calling `schema.validate(req.params)` inline inside the handler.

**Reasoning:** Inline validation duplicates the same pattern (validate → check error → throw `ValidationError`) in every handler. The middleware extracts this into a single reusable function: it validates all three sources (params, query, body) in one pass, collects all Joi errors with `abortEarly: false`, and puts the validated values in `res.locals` (`validatedParams`, `validatedQuery`, `validatedBody`). Route handlers then destructure directly from `res.locals` without any validation boilerplate. Consistent with the pattern used in payments-api.

**Tradeoff:** `res.locals` is not strongly typed — handlers use `as { ... }` casts. This is acceptable given the validation has already happened upstream; the cast reflects known post-validation shape, not blind trust.

## Committing .env.development

**Decision:** `.env.development` is committed to the repository and not gitignored.

**Reasoning:** The file contains no secrets — only a `DATABASE_URL` pointing to the local Docker MySQL container with hardcoded dev credentials (`dev:dev@localhost:3306/dev`) that are already in plain sight in `docker-compose.dev.yml`. Gitignoring it would mean every new developer has to manually create it before the app starts, with no indication of what value to put in it. Committing it makes the local setup zero-friction: clone, install, start.

**When to revisit:** The moment any real secret (API key, token, external service credential) needs to go into a local env file, that file must be gitignored and handled via a secrets manager or a documented `.env.example` pattern instead.
