import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePrivacyDto {
  @IsOptional()
  @IsString()
  profileVisibility?: string;

  @IsOptional()
  @IsString()
  followersVisibility?: string;

  @IsOptional()
  @IsString()
  followingVisibility?: string;
}
