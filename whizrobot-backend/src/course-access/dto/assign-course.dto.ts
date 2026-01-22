import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class AssignCourseDto {
  @IsInt()
  @Min(1)
  course_id: number;

  @IsArray()
  @ArrayNotEmpty()
  allowed_levels: number[];
}
