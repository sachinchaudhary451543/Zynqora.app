import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  recoveryCode: string;
}
