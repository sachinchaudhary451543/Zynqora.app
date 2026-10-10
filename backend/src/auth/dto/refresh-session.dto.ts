import { IsString, Matches } from 'class-validator';

export class RefreshSessionDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'Refresh token is invalid' })
  refreshToken: string;
}
