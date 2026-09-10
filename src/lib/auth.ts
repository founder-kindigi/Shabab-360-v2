import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { resolveActiveIdentity } from "@/lib/auth/identity";
import { consumeLoginAttempt } from "@/lib/auth/login-throttle";
import { z } from "zod";

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
        const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(1024) }).safeParse(credentials);
        if (!parsed.success) return null;
        try {
          if (!(await consumeLoginAttempt(parsed.data.email))) return null;
          const user = await db.user.findUnique({ where: { email: parsed.data.email } });
          if (!user?.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
          const identity = await resolveActiveIdentity(user.id);
          if (!identity) return null;
          return { id: user.id, email: user.email, name: user.name, mustResetPwd: user.mustResetPwd, tokenVersion: user.tokenVersion, ...identity };
        } catch {
          // Storage or throttle failures deny login; never log submitted identities.
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, { id: user.id, role: user.role, mustResetPwd: user.mustResetPwd, tokenVersion: user.tokenVersion, assignedCityId: user.assignedCityId, assignedParkId: user.assignedParkId, assignedGroupId: user.assignedGroupId });
      }
      if (!token.id) return {};
      try {
        const current = await db.user.findUnique({ where: { id: token.id }, select: { tokenVersion: true, isActive: true, mustResetPwd: true } });
        if (!current?.isActive || current.tokenVersion !== token.tokenVersion) return {};
        const identity = await resolveActiveIdentity(token.id);
        if (!identity) return {};
        Object.assign(token, identity, { mustResetPwd: current.mustResetPwd });
      } catch {
        return {};
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
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
