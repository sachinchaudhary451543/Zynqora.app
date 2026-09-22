import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePrivacyDto } from './dto/update-profile.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { RemoveDeviceTokenDto } from './dto/remove-device-token.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Public profile endpoint (requires auth in current app but respects visibility)
  @UseGuards(JwtAuthGuard)
  @Get(':username')
  getProfile(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    const viewerId = user?.userId;
    return this.usersService.getProfile(username, viewerId);
  }

  // Update basic profile fields
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, body);
  }

  // Update privacy settings
  @UseGuards(JwtAuthGuard)
  @Patch('me/privacy')
  updatePrivacy(
    @CurrentUser() user: { userId: string },
    @Body() body: UpdatePrivacyDto,
  ) {
    return this.usersService.updatePrivacy(user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteAccount(@CurrentUser() user: { userId: string }) {
    return this.usersService.deleteAccount(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':username/follow')
  follow(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.usersService.follow(user.userId, username);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':username/unfollow')
  unfollow(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.usersService.unfollow(user.userId, username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/notifications')
  getNotifications(@CurrentUser() user: { userId: string }) {
    return this.usersService.getNotifications(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/device-tokens')
  registerDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() body: RegisterDeviceTokenDto,
  ) {
    return this.usersService.registerDeviceToken(user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/device-tokens/current')
  removeCurrentDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() body: RemoveDeviceTokenDto,
  ) {
    return this.usersService.removeDeviceToken(user.userId, body.token);
  }

  // Followers / Following lists
  @UseGuards(JwtAuthGuard)
  @Get(':username/followers')
  getFollowers(@CurrentUser() user: { userId: string }, @Param('username') username: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.usersService.getFollowers(username, user?.userId, cursor, Number(limit) || 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/following')
  getFollowing(@CurrentUser() user: { userId: string }, @Param('username') username: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.usersService.getFollowing(username, user?.userId, cursor, Number(limit) || 20);
  }
}
