import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

type AuditLogItem = {
  action: string;
  actor_email: string | null;
  org_name: string | null;
  created_at: Date;
  meta: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(user: JwtPayload, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);

    if (user.is_superadmin) {
      const logs = await this.prisma.adminAuditLog.findMany({
        orderBy: { created_at: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          actor: {
            select: { email: true, org_id: true },
          },
        },
      });

      const items = await this.enrichLogs(logs);
      return { items, page: safePage, pageSize: safePageSize };
    }

    if (!user.org_id) {
      return { items: [], page: safePage, pageSize: safePageSize };
    }

    const fetchLimit = safePageSize * 5 + (safePage - 1) * safePageSize;
    const logs = await this.prisma.adminAuditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: fetchLimit,
      include: {
        actor: {
          select: { email: true, org_id: true },
        },
      },
    });

    const items = await this.enrichLogs(logs, user.org_id);
    const start = (safePage - 1) * safePageSize;
    return {
      items: items.slice(start, start + safePageSize),
      page: safePage,
      pageSize: safePageSize,
    };
  }

  private async enrichLogs(
    logs: Array<{
      action_type: string;
      actor_user_id: number;
      entity_type: string;
      entity_id: number;
      created_at: Date;
      actor: { email: string | null; org_id: number | null } | null;
    }>,
    orgId?: number,
  ): Promise<AuditLogItem[]> {
    const organizationIds = new Set<number>();
    const licenseIds = new Set<number>();
    const robotIds = new Set<number>();
    const userIds = new Set<number>();
    const courseIds = new Set<number>();
    const courseLevelIds = new Set<number>();
    const lessonIds = new Set<number>();

    if (orgId) {
      organizationIds.add(orgId);
    }

    logs.forEach((log) => {
      switch (log.entity_type) {
        case 'Organization':
          organizationIds.add(log.entity_id);
          break;
        case 'License':
          licenseIds.add(log.entity_id);
          break;
        case 'Robot':
          robotIds.add(log.entity_id);
          break;
        case 'User':
          userIds.add(log.entity_id);
          break;
        case 'Course':
          courseIds.add(log.entity_id);
          break;
        case 'CourseLevel':
          courseLevelIds.add(log.entity_id);
          break;
        case 'Lesson':
          lessonIds.add(log.entity_id);
          break;
        default:
          break;
      }
    });

    const [organizations, licenses, robots, users, courses, courseLevels, lessons] =
      await Promise.all([
        this.prisma.organization.findMany({
          where: { id: { in: Array.from(organizationIds) } },
        }),
        this.prisma.license.findMany({
          where: { id: { in: Array.from(licenseIds) } },
          select: { id: true, org_id: true },
        }),
        this.prisma.robot.findMany({
          where: { id: { in: Array.from(robotIds) } },
          select: { id: true, org_id: true },
        }),
        this.prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, org_id: true },
        }),
        this.prisma.course.findMany({
          where: { id: { in: Array.from(courseIds) } },
          select: { id: true, course_name: true },
        }),
        this.prisma.courseLevel.findMany({
          where: { id: { in: Array.from(courseLevelIds) } },
          select: { id: true, course_id: true },
        }),
        this.prisma.lesson.findMany({
          where: { id: { in: Array.from(lessonIds) } },
          select: { id: true, course_level_id: true },
        }),
      ]);

    const orgById = new Map(organizations.map((org) => [org.id, org]));
    const licenseOrgById = new Map(licenses.map((item) => [item.id, item.org_id]));
    const robotOrgById = new Map(robots.map((item) => [item.id, item.org_id]));
    const userOrgById = new Map(
      users
        .filter((item) => item.org_id !== null)
        .map((item) => [item.id, item.org_id as number]),
    );
    const courseNameById = new Map(courses.map((item) => [item.id, item.course_name]));
    const courseLevelCourseId = new Map(
      courseLevels.map((item) => [item.id, item.course_id]),
    );
    const lessonCourseId = new Map(
      lessons
        .map((item) => [item.id, courseLevelCourseId.get(item.course_level_id)])
        .filter((item): item is [number, number] => Boolean(item[1])),
    );

    let allowedCourseIds = new Set<number>();
    if (orgId) {
      const courseAccesses = await this.prisma.organizationCourseAccess.findMany({
        where: { org_id: orgId },
        select: { course_id: true },
      });
      allowedCourseIds = new Set(courseAccesses.map((item) => item.course_id));
    }

    const items: AuditLogItem[] = [];

    for (const log of logs) {
      const derivedOrgId = this.getOrgIdForLog(
        log,
        licenseOrgById,
        robotOrgById,
        userOrgById,
        allowedCourseIds,
        courseLevelCourseId,
        lessonCourseId,
        orgId ?? null,
      );

      if (orgId) {
        const actorOrgId = log.actor?.org_id ?? null;
        if (derivedOrgId !== orgId && actorOrgId !== orgId) {
          continue;
        }
      }

      const orgName =
        derivedOrgId && orgById.has(derivedOrgId)
          ? orgById.get(derivedOrgId)!.name
          : null;

      const meta = this.buildMeta(log, orgById, courseNameById);

      items.push({
        action: log.action_type,
        actor_email: log.actor?.email ?? null,
        org_name: orgName,
        created_at: log.created_at,
        meta,
      });
    }

    return items;
  }

  private getOrgIdForLog(
    log: { entity_type: string; entity_id: number },
    licenseOrgById: Map<number, number>,
    robotOrgById: Map<number, number>,
    userOrgById: Map<number, number>,
    allowedCourseIds: Set<number>,
    courseLevelCourseId: Map<number, number>,
    lessonCourseId: Map<number, number>,
    orgId: number | null,
  ) {
    switch (log.entity_type) {
      case 'Organization':
        return log.entity_id;
      case 'License':
        return licenseOrgById.get(log.entity_id) ?? null;
      case 'Robot':
        return robotOrgById.get(log.entity_id) ?? null;
      case 'User':
        return userOrgById.get(log.entity_id) ?? null;
      case 'Course':
        return allowedCourseIds.has(log.entity_id) ? orgId : null;
      case 'CourseLevel': {
        const courseId = courseLevelCourseId.get(log.entity_id);
        return courseId && allowedCourseIds.has(courseId) ? orgId : null;
      }
      case 'Lesson': {
        const courseId = lessonCourseId.get(log.entity_id);
        return courseId && allowedCourseIds.has(courseId) ? orgId : null;
      }
      default:
        return null;
    }
  }

  private buildMeta(
    log: { entity_type: string; entity_id: number },
    orgById: Map<number, { region: string; type: string }>,
    courseNameById: Map<number, string>,
  ) {
    if (log.entity_type === 'Organization') {
      const org = orgById.get(log.entity_id);
      if (org) {
        return { region: org.region, type: org.type };
      }
    }

    if (log.entity_type === 'Course') {
      const courseName = courseNameById.get(log.entity_id);
      if (courseName) {
        return { course_name: courseName };
      }
    }

    return null;
  }
}
