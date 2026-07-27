# TEST-QUALITY-001: Test Isolation and Reliability Audit

## Objective
This report provides a read-only audit of automated test isolation, evaluating the risk of tests inadvertently interacting with real services, shared mutable state, or local machine configuration. The goal is to provide a baseline for safely scaling the test suite.

## Findings

### 1. Database and Environment Isolation (P1)
**Finding:** Test runs implicitly inherit the host machine's environment variables (`process.env`) because no explicit environment isolation (e.g., `env` config in Vitest, or `.env.test`) is enforced.
- **Reference:** `vitest.config.ts` (L10-L14). The `test` configuration omits `env` overrides.
- **Impact:** If a developer has a real `DATABASE_URL` in their local `.env` and a test instantiates a `PrismaClient` without mocking, the test will execute queries against the real database.
- **Note:** The CI workflow (`.github/workflows/ci.yml`, L59-L60) safely executes `npm run test` without injecting a `DATABASE_URL`, creating a fail-closed environment where unmocked DB calls will result in a connection error rather than silently succeeding.

### 2. Mock State Persistence (P2)
**Finding:** `vitest.config.ts` configures `clearMocks: true`, which clears call histories between tests, but does not configure `mockReset: true` or `restoreMocks: true`.
- **Reference:** `vitest.config.ts` (L13).
- **Impact:** Global mocks, such as `vi.stubGlobal("fetch", ...)` seen in `src/lib/api/fetch-json-array.test.ts` (L10) or custom `vi.mock()` implementations, will persist their behavior across different `it` blocks unless explicitly cleared or reset in a `beforeEach` hook. This risks introducing hidden test-order dependencies (flakiness).

### 3. File System Determinism (Strength)
**Finding:** Tests interacting with the file system use safe, isolated temporary directories that are cleanly removed.
- **Reference:** `src/lib/calling-import/__tests__/calling-import.test.ts` (L51, L76).
- **Details:** The test safely invokes `fs.mkdtempSync(path.join(os.tmpdir(), "calling-import-test-"))` to generate synthetic fixtures and uses an `afterEach` hook with `fs.rmSync(..., { recursive: true, force: true })` to ensure reliable cleanup.

### 4. Robust Authorization Mocking (Strength)
**Finding:** Test mocks effectively cover authorization denial and failure paths, preventing silent successes.
- **Reference:** `src/app/api/admin/fees/[id]/payments/route.test.ts` (L11-L13, L42-L47).
- **Details:** The tests explicitly mock `@/lib/auth/authorize` and `@/lib/db`, systematically verifying HTTP 403 (Forbidden) and HTTP 400/409 (Bad Request/Conflict) paths before asserting that database transactions are never opened.

### 5. CLI Invocation Safeguards (Strength)
**Finding:** Tests invoking CLI scripts in separate processes safely isolate the environment by explicit overriding.
- **Reference:** `src/lib/calling-import/__tests__/calling-import.test.ts` (L467-L471).
- **Details:** When invoking `execSync`, the tests forcefully override `DATABASE_URL` with an invalid connection string (`"invalid-schema-url"` or `"sqlite://invalid-db-for-test-safety"`), ensuring the child process cannot accidentally interact with a shared database.

## Recommendations and Remediation Sequence

1. **[P1] Enforce Environment Isolation in Vitest Config**
   Update `vitest.config.ts` to strictly isolate `process.env`. Specifically, override critical variables like `DATABASE_URL` to a dummy value (e.g., `"postgresql://dummy:dummy@localhost/dummy"`) to ensure any unmocked Prisma instantiation fails immediately on local developer machines.

2. **[P2] Enable Automatic Mock Resetting**
   Add `mockReset: true` to the `test` block in `vitest.config.ts` to ensure that mock implementations and returns (not just call histories) are reset between tests. This will proactively prevent test-order dependencies.

3. **[P2] Formalize `.env.test`**
   Consider utilizing a dedicated `.env.test` file specifically for `vitest` runs to standardize the test environment payload and decouple it from local developer setups.
