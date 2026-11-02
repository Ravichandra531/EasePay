import { prisma } from "@repo/db";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { JWT } from "next-auth/jwt";
import type { NextAuthOptions, Session } from "next-auth";
import { verifyEmailCode } from "./supabase-email";

const authSchema = z.object({
  identifier: z.string().trim().min(3).max(100),
  password: z.string().min(6).max(100),
});

function looksLikeEmail(value: string) {
  return value.includes("@");
}

export const authOptions: NextAuthOptions = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    CredentialsProvider({
      id: "email-otp",
      name: "Email verification code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const email = await verifyEmailCode(
            credentials?.email,
            credentials?.code,
          );
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;
          return {
            id: String(user.id),
            name: user.name ?? "",
            email: user.email,
          };
        } catch {
          return null;
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: {
          label: "Email or phone",
          type: "text",
          placeholder: "name@email.com or 9876543210",
        },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const parsed = authSchema.safeParse(credentials ?? {});
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;
        const id = identifier.trim();

        const existingUser = looksLikeEmail(id)
          ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
          : await prisma.user.findUnique({ where: { number: id } });

        if (existingUser) {
          const isValid = await bcrypt.compare(password, existingUser.password);
          if (!isValid) return null;

          return {
            id: existingUser.id.toString(),
            name: existingUser.name ?? "",
            email: existingUser.email ?? existingUser.number,
          };
        }

        // No implicit sign-up here. Account creation happens on /signup.
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  callbacks: {
    async jwt({ token, trigger }) {
      if (trigger === "update" && token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: Number(token.sub) },
          select: { name: true, email: true },
        });
        if (user) {
          token.name = user.name;
          token.email = user.email;
        }
      }
      return token;
    },
    async session({ token, session }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub || "";
      }
      return session;
    },
  },
};
