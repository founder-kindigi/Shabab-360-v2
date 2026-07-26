import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function fingerprintLoginIdentifier(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Login rate limit secret is unavailable");
  return crypto.createHmac("sha256", secret).update(email).digest("hex");
}

function loginAttemptWindowStart() {
  return new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
}

async function isLoginRateLimited(identifier: string) {
  const attempts = await db.loginAttempt.count({
    where: { identifier, createdAt: { gte: loginAttemptWindowStart() } },
  });
  return attempts >= MAX_LOGIN_ATTEMPTS;
}

async function recordFailedLogin(identifier: string) {
  const windowStart = loginAttemptWindowStart();
  await db.$transaction(async (tx) => {
    await tx.loginAttempt.deleteMany({ where: { createdAt: { lt: windowStart } } });
    await tx.loginAttempt.create({ data: { identifier } });
  });
}

async function clearFailedLogins(identifier: string) {
  await db.loginAttempt.deleteMany({ where: { identifier } });
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
          console.warn("[NextAuth Authorize] Missing credentials");
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        let loginIdentifier: string;

        try {
          loginIdentifier = fingerprintLoginIdentifier(normalizedEmail);
          if (await isLoginRateLimited(loginIdentifier)) {
            console.warn("[NextAuth Authorize] Rate limit exceeded");
            return null;
          }
        } catch {
          console.warn("[NextAuth Authorize] Rate limit unavailable");
          return null;
        }

        async function rejectLogin(reason: string) {
          try {
            await recordFailedLogin(loginIdentifier);
          } catch {
            console.warn("[NextAuth Authorize] Rate limit persistence failed");
          }
          console.warn(reason);
          return null;
        }

        // Authentication must use an exact normalized identifier. A partial-match
        // fallback can select the wrong account when addresses share a substring.
        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          return rejectLogin("[NextAuth Authorize] User not found");
        }

        if (!user.isActive) {
          return rejectLogin("[NextAuth Authorize] Account inactive");
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return rejectLogin("[NextAuth Authorize] Password invalid");
        }

        try {
          await clearFailedLogins(loginIdentifier);
        } catch {
          console.warn("[NextAuth Authorize] Rate limit cleanup failed");
        }

        // Resolve role
        let role: string | null = null;
        let assignedCityId: string | null = null;
        let assignedParkId: string | null = null;
        let assignedGroupId: string | null = null;

        const staffMeta = await db.staffMeta.findUnique({
          where: { userId: user.id },
        });

        if (staffMeta) {
          role = staffMeta.role;
          assignedCityId = staffMeta.assignedCityId;
          assignedParkId = staffMeta.assignedParkId;
          assignedGroupId = staffMeta.assignedGroupId;
        } else {
          const guardian = await db.guardian.findUnique({
            where: { userId: user.id },
          });
          if (guardian) {
            role = "guardian";
          } else {
            const participant = await db.participant.findUnique({
              where: { userId: user.id },
            });
            if (participant) {
              role = "student";
            }
          }
        }

        if (!role) {
          console.warn("[NextAuth Authorize] No role found");
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
      // Gracefully handle DB errors to prevent refresh from logging user out.
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id },
            select: { tokenVersion: true },
          });
          if (dbUser && token.tokenVersion !== dbUser.tokenVersion) {
            return {};
          }
        } catch {
          // DB unreachable — keep existing session valid rather than logging out
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
