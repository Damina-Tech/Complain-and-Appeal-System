import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import KeycloakBearerStrategy from 'passport-keycloak-bearer';
import { keycloakConnectConfig } from '../../keycloak.config';

@Injectable()
export class KeycloakAuthStrategy extends PassportStrategy(KeycloakBearerStrategy, 'keycloak-bearer') {
  constructor() {
    super({
      // Provide only supported fields for passport-keycloak-bearer
      realm: keycloakConnectConfig.realm,
      url: keycloakConnectConfig.authServerUrl,
      clientId: keycloakConnectConfig.clientId,
      secret: keycloakConnectConfig.secret,
      realmPublicKey: keycloakConnectConfig.realmPublicKey,
    } as any);
  }

  // The validate method is called after the token is verified
  // The payload contains the decoded access token
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException();
    }
    // You can perform additional checks here if needed
    return payload;
  }
}