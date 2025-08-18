import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type * as KeycloakConnect from 'keycloak-connect';
import { KeycloakAuthGuard } from '../keycloak/auth/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

  @Get()
  @UseGuards(KeycloakAuthGuard)
  @ApiOkResponse({ description: 'Greet the authenticated user', schema: { example: { message: 'Hello, user' } } })
  getUsers(
    @Req() req: Request & { kauth?: { grant?: KeycloakConnect.Grant } },
  ) {
    const grant: KeycloakConnect.Grant | undefined = req.kauth?.grant;
    const token = grant?.access_token as unknown as {
      content?: { preferred_username?: string };
    };
    const username = token?.content?.preferred_username ?? 'user';
    return {
      message: `Hello, ${username}`,
    };
  }
}
