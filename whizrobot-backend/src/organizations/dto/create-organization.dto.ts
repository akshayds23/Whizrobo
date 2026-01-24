import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  region?: string;
}

export class RoleDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsArray()
  permissions: string[];
}

export class CreateOrganizationRequestDto extends CreateOrganizationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrganizationDto)
  organization?: CreateOrganizationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[];
}
