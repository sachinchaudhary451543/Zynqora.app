import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CircleGameRoundDto {
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  choices: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number;
}

export class CreateCircleEventDto {
  @IsOptional()
  @IsIn(['EVENT', 'GAME', 'TOURNAMENT', 'ACTIVITY'])
  kind?: 'EVENT' | 'GAME' | 'TOURNAMENT' | 'ACTIVITY';

  @IsOptional()
  @IsIn(['ONLINE', 'IN_PERSON', 'HYBRID'])
  mode?: 'ONLINE' | 'IN_PERSON' | 'HYBRID';

  @IsOptional()
  @IsIn(['EXTERNAL', 'NATIVE_TRIVIA'])
  gameMode?: 'EXTERNAL' | 'NATIVE_TRIVIA';

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  gameUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(200)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(['SINGLE_ELIMINATION', 'ROUND_ROBIN'])
  tournamentFormat?: 'SINGLE_ELIMINATION' | 'ROUND_ROBIN';

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(80)
  templateId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CircleGameRoundDto)
  rounds?: CircleGameRoundDto[];
}
