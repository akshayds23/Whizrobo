import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RecommendDto {
  @IsString()
  @MinLength(2)
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  org_id?: number;
}
