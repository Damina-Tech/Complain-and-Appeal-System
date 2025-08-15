import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

const handler = NextAuth({
  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_FRONTEND_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_FRONTEND_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) (token as any).accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      if ((token as any)?.accessToken) (session as any).accessToken = (token as any).accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };


