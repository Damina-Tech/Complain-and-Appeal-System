import 'dotenv/config';

export const keycloakConnectConfig = {
  // For passport-keycloak-bearer
  authServerUrl: process.env.KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM ?? 'complain-and-appeal',
  clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'nestjs-backend',
  secret: process.env.KEYCLOAK_CLIENT_SECRET ?? 'lZpBSD66yMexatcjELFPdY8mzzoNSF1m',
  realmPublicKey: process.env.KEYCLOAK_REALM_PUBLIC_KEY ?? '89J88JarW8FW32JuHEEcn92juIkwWNDL_DPEpUoxg28',
} as const;