"use client";

import { ReactNode, useEffect, useState, createContext } from "react";
import keycloak from "@/lib/keycloak";

type AuthContextType = {
  token: string | null;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  token: null,
  authenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    keycloak
      .init({ onLoad: "login-required", checkLoginIframe: false })
      .then((auth) => {
        if (auth) {
          setAuthenticated(true);
          setToken(keycloak.token || null);

          // refresh token every 50s
          setInterval(() => {
            keycloak.updateToken(70).then((refreshed) => {
              if (refreshed) setToken(keycloak.token || null);
            });
          }, 50000);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        authenticated,
        login: () => keycloak.login(),
        logout: () => keycloak.logout(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
