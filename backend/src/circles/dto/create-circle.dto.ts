import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const CIRCLE_CATEGORIES = [
  'community',
  'entertainment',
  'gaming',
  'creators',
  'blogging',
  'vlogging',
  'streaming',
  'events',
  'learning',
  'students',
  'inventors',
  'couples',
  'friends',
  'sports',
] as const;

export class CreateCircleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(48)
  name: string;

  @IsIn(CIRCLE_CATEGORIES)
  category: typeof CIRCLE_CATEGORIES[number];

  @IsString()
  @MinLength(12)
  @MaxLength(320)
  description: string;
}
