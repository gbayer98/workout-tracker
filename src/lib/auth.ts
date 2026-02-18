import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const trimmed = (credentials.username as string).trim().toLowerCase();
        if (!trimmed) return null;

        const user = await prisma.user.findFirst({
          where: { username: { equals: trimmed, mode: "insensitive" } },
        });
        if (!user) return null;

        const valid = await compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return { id: user.id, name: user.username };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token }) {
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true },
        });
        if (!user) {
          return { ...token, sub: undefined };
        }
        token.role = user.role;

        // Update lastActiveAt (throttled: once per 5 minutes via token timestamp)
        const lastUpdate = (token.lastActiveUpdate as number) || 0;
        if (Date.now() - lastUpdate > 5 * 60 * 1000) {
          await prisma.user.update({
            where: { id: token.sub },
            data: { lastActiveAt: new Date() },
          }).catch(() => {}); // fire-and-forget
          token.lastActiveUpdate = Date.now();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
