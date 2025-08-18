import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersController } from './users/users.controller';
import { KeycloakAuthStrategy } from './keycloak/auth/auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [PassportModule],
  controllers: [AppController, UsersController, AuthController],
  providers: [AppService, KeycloakAuthStrategy, AuthService],
})
export class AppModule {}
