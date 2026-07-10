import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Augment NextAuth types to include custom user properties
declare module "next-auth" {
  interface User {
    role?: string;
    mustResetPwd?: boolean;
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
    assignedCityId?: string | null;
    assignedParkId?: string | null;
    assignedGroupId?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  url: process.env.NEXTAUTH_URL || "http://localhost:3000",
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
        token.assignedCityId = user.assignedCityId;
        token.assignedParkId = user.assignedParkId;
        token.assignedGroupId = user.assignedGroupId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id!;
        session.user.role = token.role;
        session.user.mustResetPwd = token.mustResetPwd;
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
  secret: process.env.NEXTAUTH_SECRET || "shabab360-dev-secret-change-in-production",
};