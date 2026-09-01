import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Get('username-availability')
  checkUsername(@Query('username') username: string) {
    return this.authService.checkUsername(username);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { identifier: string; recoveryCode: string }) {
    return this.authService.requestPasswordReset(body?.identifier, body?.recoveryCode);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body?.token, body?.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
