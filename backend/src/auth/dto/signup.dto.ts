import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'Username may only contain letters, numbers, underscores and dots',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be no longer than 128 characters' })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/, { message: 'Name cannot be empty' })
  name: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(['tech', 'creative', 'gaming', 'wellness', 'family'], { each: true })
  interests?: string[];
}
