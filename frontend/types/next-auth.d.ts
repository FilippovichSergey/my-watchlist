import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Set when the Google token could not be renewed; the user has to sign in again. */
    error?: "RefreshTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    refreshToken?: string;
    /** Unix seconds at which idToken expires. */
    expiresAt?: number;
    error?: "RefreshTokenError";
  }
}
