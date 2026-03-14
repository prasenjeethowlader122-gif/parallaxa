import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPaths = ['/dashboard', '/admin', '/profile', '/settings'];
      const isProtected = protectedPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      );
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register');

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
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
}