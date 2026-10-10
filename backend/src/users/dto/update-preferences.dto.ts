import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(['tech', 'creative', 'gaming', 'wellness', 'family'], { each: true })
  interests?: string[];

  @IsOptional()
  @IsBoolean()
  notifySocialActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCircleActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyDigestEnabled?: boolean;
}
