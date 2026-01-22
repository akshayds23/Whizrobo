import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CourseAccessService } from './course-access.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AssignCourseDto } from './dto/assign-course.dto';
import { JwtPayload } from '../auth/auth.service';

@Controller('organizations/:orgId/courses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CourseAccessController {
  constructor(private readonly courseAccessService: CourseAccessService) {}

  @Post()
  @RequirePermissions('ASSIGN_COURSE')
  async assignCourse(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: AssignCourseDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.courseAccessService.assignCourse(orgId, dto, req.user.sub);
  }

  @Get()
  @RequirePermissions('VIEW_ASSIGNED_COURSE')
  async listCourses(@Param('orgId', ParseIntPipe) orgId: number) {
    return this.courseAccessService.listCourses(orgId);
  }
}
