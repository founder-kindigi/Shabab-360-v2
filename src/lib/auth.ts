import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiter: email -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Short-lived tokenVersion cache to avoid a DB hit on every API request.
// The JWT callback fires on every getServerSession() call, which happens on
// every protected route. A 30-second TTL still catches password resets and
// forced sign-outs while eliminating the per-request SELECT on users.
const TOKEN_VERSION_CACHE = new Map<string, { version: number; cachedAt: number }>();
const TOKEN_VERSION_TTL_MS = 30_000; // 30 seconds
const TOKEN_VERSION_MAX_ENTRIES = 500; // bound memory in long-running servers

function getCachedTokenVersion(userId: string): number | undefined {
  const entry = TOKEN_VERSION_CACHE.get(userId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > TOKEN_VERSION_TTL_MS) {
    TOKEN_VERSION_CACHE.delete(userId);
    return undefined;
  }
  return entry.version;
}

function setCachedTokenVersion(userId: string, version: number): void {
  if (TOKEN_VERSION_CACHE.size >= TOKEN_VERSION_MAX_ENTRIES) {
    // evict the oldest entry
    const firstKey = TOKEN_VERSION_CACHE.keys().next().value;
    if (firstKey) TOKEN_VERSION_CACHE.delete(firstKey);
  }
  TOKEN_VERSION_CACHE.set(userId, { version, cachedAt: Date.now() });
}

/** Call after a password reset or forced sign-out so the next request re-checks the DB. */
export function invalidateTokenVersionCache(userId: string): void {
  TOKEN_VERSION_CACHE.delete(userId);
}

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  entry.count++;
  return true;
}

function resetRateLimit(email: string) {
  rateLimitMap.delete(email);
}

// Augment NextAuth types to include custom user properties
declare module "next-auth" {
  interface User {
    role?: string;
    mustResetPwd?: boolean;
    tokenVersion?: number;
    assignedCityId?: string | null;
    assignedParkId?: string | null;
    assignedGroupId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      mustResetPwd?: boolean;
      tokenVersion?: number;
      assignedCityId?: string | null;
      assignedParkId?: string | null;
      assignedGroupId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    mustResetPwd?: boolean;
    tokenVersion?: number;
    assignedCityId?: string | null;
    assignedParkId?: string | null;
    assignedGroupId?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Rate limiting: check before DB query
        if (!checkRateLimit(credentials.email)) {
          return null;
        }

        // Find active user
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Successful login: reset rate limit
        resetRateLimit(credentials.email);

        // Resolve role
        let role: string | null = null;
        let assignedCityId: string | null = null;
        let assignedParkId: string | null = null;
        let assignedGroupId: string | null = null;

        const staffMeta = await db.staffMeta.findUnique({
          where: { userId: user.id },
        });

        if (staffMeta && staffMeta.isActive) {
          role = staffMeta.role;
          assignedCityId = staffMeta.assignedCityId;
          assignedParkId = staffMeta.assignedParkId;
          assignedGroupId = staffMeta.assignedGroupId;
        } else {
          // Check if guardian
          const guardian = await db.guardian.findUnique({
            where: { userId: user.id },
          });
          if (guardian && guardian.isActive) {
            role = "guardian";
          } else {
            // Check if student/participant
            const participant = await db.participant.findUnique({
              where: { userId: user.id },
            });
            if (participant) {
              role = "student";
            }
          }
        }

        if (!role) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          role,
          mustResetPwd: user.mustResetPwd,
          tokenVersion: user.tokenVersion,
          assignedCityId,
          assignedParkId,
          assignedGroupId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustResetPwd = user.mustResetPwd;
        token.tokenVersion = user.tokenVersion;
        token.assignedCityId = user.assignedCityId;
        token.assignedParkId = user.assignedParkId;
        token.assignedGroupId = user.assignedGroupId;
      }

      // Check if token version matches DB — invalidate if password was changed.
      // Uses a 30-second in-memory cache to avoid a DB hit on every API request.
      if (token.id) {
        const cachedVersion = getCachedTokenVersion(token.id);
        if (cachedVersion !== undefined) {
          // Cache hit — no DB query needed this request
          if (token.tokenVersion !== cachedVersion) return {};
        } else {
          // Cache miss — fetch from DB and populate cache
          const dbUser = await db.user.findUnique({
            where: { id: token.id },
            select: { tokenVersion: true },
          });
          if (!dbUser) return {};
          setCachedTokenVersion(token.id, dbUser.tokenVersion);
          if (token.tokenVersion !== dbUser.tokenVersion) return {};
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id!;
        session.user.role = token.role;
        session.user.mustResetPwd = token.mustResetPwd;
        session.user.tokenVersion = token.tokenVersion;
        session.user.assignedCityId = token.assignedCityId;
        session.user.assignedParkId = token.assignedParkId;
        session.user.assignedGroupId = token.assignedGroupId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
