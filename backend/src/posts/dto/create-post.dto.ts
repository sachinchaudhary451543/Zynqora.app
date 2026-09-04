import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  musicUrl?: string;

  @IsOptional()
  @IsIn(['audio'])
  musicType?: 'audio';

  @IsOptional()
  @IsIn(['image', 'video'])
  mediaType?: 'image' | 'video';

  @IsOptional()
  @IsIn(['CIRCLE', 'TREE', 'FOLLOWERS'])
  visibility?: 'CIRCLE' | 'TREE' | 'FOLLOWERS';
}
