import { IsInt, IsISO8601, Min } from 'class-validator';

export class CreateLicenseDto {
  @IsInt()
  @Min(1)
  org_id: number;

  @IsInt()
  @Min(1)
  robot_id: number;

  @IsISO8601()
  valid_from: string;

  @IsISO8601()
  valid_until: string;
}
