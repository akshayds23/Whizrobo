import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    actorUserId: number,
    actionType: string,
    entityType: string,
    entityId: number,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        actor_user_id: actorUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
      },
    });
  }

  async logOrganizationCreated(actorUserId: number, organizationId: number) {
    return this.logAction(actorUserId, 'ORG_CREATE', 'Organization', organizationId);
  }

  async logCourseAssignment(actorUserId: number, courseId: number) {
    return this.logAction(actorUserId, 'COURSE_ASSIGN', 'Course', courseId);
  }

  async logCourseAccessUpdated(actorUserId: number, courseId: number) {
    return this.logAction(actorUserId, 'COURSE_ACCESS_UPDATE', 'Course', courseId);
  }

  async logLicenseIssued(actorUserId: number, licenseId: number) {
    return this.logAction(actorUserId, 'LICENSE_ISSUE', 'License', licenseId);
  }

  async logLicenseRevoked(actorUserId: number, licenseId: number) {
    return this.logAction(actorUserId, 'LICENSE_REVOKE', 'License', licenseId);
  }

  async logPermissionChange(actorUserId: number, userId: number) {
    return this.logAction(actorUserId, 'PERMISSION_CHANGE', 'User', userId);
  }

  async logContentUpload(actorUserId: number) {
    return this.logAction(actorUserId, 'CONTENT_UPLOAD', 'ContentUpload', 0);
  }

  async logCourseCreated(actorUserId: number, courseId: number) {
    return this.logAction(actorUserId, 'COURSE_CREATE', 'Course', courseId);
  }

  async logLevelCreated(actorUserId: number, levelId: number) {
    return this.logAction(actorUserId, 'LEVEL_CREATE', 'CourseLevel', levelId);
  }

  async logLessonCreated(actorUserId: number, lessonId: number) {
    return this.logAction(actorUserId, 'LESSON_CREATE', 'Lesson', lessonId);
  }

  async logLessonUpdated(actorUserId: number, lessonId: number) {
    return this.logAction(actorUserId, 'LESSON_UPDATE', 'Lesson', lessonId);
  }
}
