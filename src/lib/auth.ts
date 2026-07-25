import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// DB-backed rate limiter using the login_attempts table
async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    
    // Clean old entries
    await db.loginAttempt.deleteMany({
      where: { createdAt: { lt: windowStart } },
    });

    // Count recent attempts
    const recentCount = await db.loginAttempt.count({
      where: {
        identifier,
        createdAt: { gte: windowStart },
      },
    });

    if (recentCount >= MAX_LOGIN_ATTEMPTS) {
      return false;
    }

    // Record this attempt
    await db.loginAttempt.create({
      data: { identifier },
    });

    return true;
  } catch {
    // Fail open on DB error to avoid locking everyone out
    return true;
  }
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
          console.warn("[NextAuth Authorize] Missing credentials email or password");
          return null;
        }

        // Rate limiting: check before DB query
        const allowed = await checkRateLimit(credentials.email);
        if (!allowed) {
          console.warn(`[NextAuth Authorize] Rate limit exceeded for: ${credentials.email}`);
          return null;
        }

        try {
          // Find active user
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: {
              staffMeta: true,
              guardian: true,
              participant: true,
            },
          });

          if (!user) {
            console.warn(`[NextAuth Authorize] User not found in database: ${credentials.email}`);
            return null;
          }

          if (!user.isActive) {
            console.warn(`[NextAuth Authorize] User account is inactive: ${credentials.email}`);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) {
            console.warn(`[NextAuth Authorize] Password verification failed for: ${credentials.email}`);
            return null;
          }

          // Successful login: clean up rate limit records
          await db.loginAttempt.deleteMany({
            where: { identifier: credentials.email },
          }).catch(() => {});

          // Resolve role
          let role: string | null = null;
          let assignedCityId: string | null = null;
          let assignedParkId: string | null = null;
          let assignedGroupId: string | null = null;

          if (user.staffMeta && user.staffMeta.isActive) {
            role = user.staffMeta.role;
            assignedCityId = user.staffMeta.assignedCityId;
            assignedParkId = user.staffMeta.assignedParkId;
            assignedGroupId = user.staffMeta.assignedGroupId;
          } else if (user.guardian && user.guardian.isActive) {
            role = "guardian";
          } else if (user.participant) {
            role = "student";
          }

          if (!role) {
            console.warn(`[NextAuth Authorize] User has no active role or scope assigned: ${credentials.email}`);
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
        } catch (dbErr: unknown) {
          console.error("[NextAuth Authorize DB Error]:", dbErr);
          return null;
        }
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

      // Check if token version matches DB — invalidate if password was changed
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { tokenVersion: true },
        });
        if (dbUser && token.tokenVersion !== dbUser.tokenVersion) {
          return {};
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
