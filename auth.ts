import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { adminAuth } from "@/lib/firebase/admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Authenticate with Firebase REST API
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCN_8OjsJMDBBDg0hckB5IU5yRSVUZbhyY`,
          {
            method: "POST",
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
              returnSecureToken: true,
            }),
            headers: { "Content-Type": "application/json" },
          }
        );
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        
        // 2. Fetch full user profile from Admin SDK
        const userRecord = await adminAuth.getUser(data.localId);
        
        return {
          id: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          image: userRecord.photoURL,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const fbUser = await adminAuth.getUserByEmail(user.email!).catch(() => null);
          if (!fbUser) {
            const newUser = await adminAuth.createUser({
              email: user.email!,
              displayName: user.name!,
              photoURL: user.image!,
            });
            user.id = newUser.uid;
          } else {
            user.id = fbUser.uid;
          }
        } catch (e) { return false; }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.uid as string;
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "auth/login" },
});