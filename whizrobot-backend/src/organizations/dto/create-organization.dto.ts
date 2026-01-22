import { IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  type: string;

  @IsString()
  @MinLength(2)
  region: string;
}
