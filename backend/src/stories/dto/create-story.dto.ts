import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @MaxLength(2048)
  videoUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
}