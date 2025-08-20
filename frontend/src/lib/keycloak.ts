import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080/",
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "myrealm",
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "nextjs-client",
});

export default keycloak;

