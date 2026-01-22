import { IsString, MinLength } from 'class-validator';

export class RobotLoginDto {
  @IsString()
  @MinLength(6)
  license_key: string;

  @IsString()
  @MinLength(3)
  robot_code: string;
}
