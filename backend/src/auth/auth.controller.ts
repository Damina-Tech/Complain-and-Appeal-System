import { Body, Controller, Post } from '@nestjs/common';
import { Public } from './public.decorator';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import 'dotenv/config';
import { AuthService } from './auth.service';

type LoginRequestBody = {
  username: string;
  password: string;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('login')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'demo' },
        password: { type: 'string', example: 'demo', format: 'password' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiOkResponse({
    description: 'Keycloak token response',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number' },
        refresh_token: { type: 'string' },
      },
    },
  })
  async login(@Body() body: LoginRequestBody) {
    return this.authService.login(body.username, body.password);
  }
}


