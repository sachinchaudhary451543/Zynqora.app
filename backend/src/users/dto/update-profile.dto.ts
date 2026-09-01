import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  bannerImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;
}

export class UpdatePrivacyDto {
  @IsOptional()
  @IsIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'])
  profileVisibility?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'])
  followersVisibility?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'])
  followingVisibility?: string;
}
