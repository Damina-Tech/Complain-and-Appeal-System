import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { keycloakConnectConfig } from '../keycloak.config';

export type LoginResult = Record<string, unknown>;

@Injectable()
export class AuthService {
  async login(username: string, password: string): Promise<LoginResult> {
    const keycloakUrl = keycloakConnectConfig.authServerUrl ?? 'http://localhost:8080';
    const realm = keycloakConnectConfig.realm ?? 'complain-and-appeal';
    const clientId = keycloakConnectConfig.clientId ?? 'nestjs-backend';
    const clientSecret = keycloakConnectConfig.secret ?? 'lZpBSD66yMexatcjELFPdY8mzzoNSF1m';

    const tokenEndpoint = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams();
    params.set('grant_type', 'password');
    params.set('client_id', clientId);
    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }
    params.set('username', username);
    params.set('password', password);

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const json = (await response.json()) as LoginResult;
    if (!response.ok) {
      throw new HttpException({ message: 'Login failed', details: json }, response.status as HttpStatus);
    }
    return json;
  }
}


