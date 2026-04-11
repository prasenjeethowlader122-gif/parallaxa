import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    // FIX: was '/login' which doesn't exist — correct path is '/auth/signin'
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPaths = ['/dashboard', '/admin', '/profile', '/settings', '/write'];
      const isProtected = protectedPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      );
      const isAuthPage =
        nextUrl.pathname.startsWith('/auth/signin') ||
        nextUrl.pathname.startsWith('/auth/signup');

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL('/auth/signin', nextUrl));
      }
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
};