import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersController } from './users/users.controller';
import { KeycloakAuthStrategy } from './keycloak/auth/auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { KeycloakAuthGuard } from './keycloak/auth/auth.guard';

@Module({
  imports: [PassportModule],
  controllers: [AppController, UsersController, AuthController],
  providers: [
    AppService,
    KeycloakAuthStrategy,
    AuthService,
    { provide: APP_GUARD, useClass: KeycloakAuthGuard },
  ],
})
export class AppModule {}
