import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthRateLimitGuard } from '../common/rate-limit.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

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

  @UseGuards(AuthRateLimitGuard)
  @Post('forgot-password')
  forgotPassword(@Body() body: { identifier: string; recoveryCode: string }) {
    return this.authService.requestPasswordReset(body?.identifier, body?.recoveryCode);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body?.token, body?.password);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshSession(body?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: { userId: string }) {
    return this.authService.logout(user.userId);
  }
}
