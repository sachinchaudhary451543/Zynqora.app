import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthRateLimitGuard } from '../common/rate-limit.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(AuthRateLimitGuard)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @UseGuards(AuthRateLimitGuard)
  @Get('username-availability')
  checkUsername(@Query('username') username: string) {
    return this.authService.checkUsername(username);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.identifier, body.recoveryCode);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('google/challenge')
  createGoogleChallenge() {
    return this.authService.createGoogleChallenge();
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('google')
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('refresh')
  refresh(@Body() body: RefreshSessionDto) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@CurrentUser() user: { userId: string }) {
    return this.authService.getCurrentUser(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: { userId: string }) {
    return this.authService.logout(user.userId);
  }
}
