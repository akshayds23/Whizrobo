import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { AssignCourseDto } from './dto/assign-course.dto';

@Injectable()
export class CourseAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

  async assignCourse(orgId: number, dto: AssignCourseDto, actorUserId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.course_id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.prisma.organizationCourseAccess.findUnique({
      where: { org_id_course_id: { org_id: orgId, course_id: dto.course_id } },
    });

    const access = await this.prisma.organizationCourseAccess.upsert({
      where: { org_id_course_id: { org_id: orgId, course_id: dto.course_id } },
      update: {
        allowed_levels: dto.allowed_levels,
      },
      create: {
        org_id: orgId,
        course_id: dto.course_id,
        allowed_levels: dto.allowed_levels,
      },
    });

    if (existing) {
      await this.audit.logCourseAccessUpdated(actorUserId, dto.course_id);
    } else {
      await this.audit.logCourseAssignment(actorUserId, dto.course_id);
    }

    return access;
  }

  async listCourses(orgId: number) {
    return this.prisma.organizationCourseAccess.findMany({
      where: { org_id: orgId },
      include: {
        course: true,
      },
      orderBy: { assigned_at: 'desc' },
    });
  }
}
