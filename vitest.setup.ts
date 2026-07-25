// Vitest setup — runs before each test file
// Provides default environment variables for test isolation

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../db/test.db";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-that-is-at-least-20-chars";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
