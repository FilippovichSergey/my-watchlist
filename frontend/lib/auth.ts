import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { idTokenExpiry, refreshGoogleIdToken } from "./google-token";

/**
 * Google accounts allowed to sign in, by stable account id (preferred) or by verified e-mail.
 * The backend enforces the same lists; this only keeps strangers out of the UI.
 */
const adminSubjects = allowlist(process.env.ADMIN_GOOGLE_SUBS, (value) => value);
const adminEmails = allowlist(process.env.ADMIN_EMAILS, (value) => value.toLowerCase());

function allowlist(raw: string | undefined, normalize: (value: string) => string): Set<string> {
  return new Set((raw ?? "").split(",").map((v) => normalize(v.trim())).filter(Boolean));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Offline access + consent make Google return a refresh token, so the
      // one-hour ID token can be renewed without sending the user back to Google.
      authorization: { params: { access_type: "offline", prompt: "consent" } },
    }),
  ],
  pages: { error: "/admin" },
  // Verbose Auth.js logging in the dev server console; never in production
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    signIn({ profile }) {
      if (profile?.sub && adminSubjects.has(profile.sub)) return true;
      const email = profile?.email?.toLowerCase();
      return !!email && profile?.email_verified === true && adminEmails.has(email);
    },
    async jwt({ token, account }) {
      if (account) {
        // Fresh sign-in: the Google tokens live only in this encrypted, httpOnly cookie.
        // Renewal is scheduled by the ID token's own exp, not the access token's expires_at.
        return {
          ...token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: idTokenExpiry(account.id_token) ?? account.expires_at,
          error: undefined,
        };
      }
      if (token.expiresAt && Date.now() < (token.expiresAt - 60) * 1000) {
        return token;
      }
      return refreshGoogleIdToken(token, {
        clientId: process.env.AUTH_GOOGLE_ID ?? "",
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      });
    },
    session({ session, token }) {
      // The browser never sees the Google tokens, only whether they are still usable
      session.error = token.error;
      // Google's stable account id, shown on the admin page so it can be copied into ADMIN_GOOGLE_SUBS
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
