import { IsBoolean } from 'class-validator';

export class PromptParticipationDto {
  @IsBoolean()
  participating: boolean;
}
