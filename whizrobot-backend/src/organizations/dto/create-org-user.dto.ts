import { IsEmail, IsInt, Min, MinLength } from 'class-validator';

export class CreateOrgUserDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsInt()
  @Min(1)
  role_id: number;
}
