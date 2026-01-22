import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { CourseLevel, Lesson, OrganizationCourseAccess } from '@prisma/client';
import {
  LicenseStatus,
  LicenseStatusService,
} from '../licenses/license-status.service';

type SyncResponse = {
  status: 'OK' | 'LOCKED';
  lock_reason?: 'EXPIRED' | 'REVOKED' | 'ACCESS_REMOVED';
  license_status: LicenseStatus;
  days_remaining: number | null;
  notifications: Array<{ type: string; message: string }>;
  refresh_required: boolean;
  courses: Array<{
    id: number;
    course_code: string;
    course_name: string;
    levels: Array<{
      id: number;
      level_name: string;
      sequence_no: number;
      lessons: Array<{
        id: number;
        lesson_name: string;
        content_type: string;
        content_url: string;
        is_public: boolean;
        updated_at: Date;
      }>;
    }>;
  }>;
  public_courses: Array<{
    id: number;
    course_code: string;
    course_name: string;
    levels: Array<{
      id: number;
      level_name: string;
      sequence_no: number;
      lessons: Array<{
        id: number;
        lesson_name: string;
        content_type: string;
        content_url: string;
        is_public: boolean;
        updated_at: Date;
      }>;
    }>;
  }>;
};

type CourseWithLevels = {
  id: number;
  course_code: string;
  course_name: string;
  levels: Array<CourseLevel & { lessons: Lesson[] }>;
};

@Injectable()
export class RobotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseStatusService: LicenseStatusService,
  ) {}

  async sync(payload: JwtPayload): Promise<SyncResponse> {
    const licenseInfo = await this.licenseStatusService.getStatusForRobot(
      payload.sub,
    );

    const licenseStatus: LicenseStatus = licenseInfo?.status ?? 'REVOKED';

    if (licenseStatus === 'EXPIRED' || licenseStatus === 'REVOKED') {
      return {
        status: 'LOCKED',
        lock_reason: licenseStatus,
        license_status: licenseStatus,
        days_remaining: licenseInfo?.days_remaining ?? null,
        notifications:
          licenseInfo?.notifications.map((notification) => ({
            type: notification.type,
            message: notification.message,
          })) ?? [],
        refresh_required: false,
        courses: [],
        public_courses: [],
      };
    }

    if (payload.org_id == null) {
      return {
        status: 'LOCKED',
        lock_reason: 'ACCESS_REMOVED',
        license_status: licenseStatus,
        days_remaining: licenseInfo?.days_remaining ?? null,
        notifications:
          licenseInfo?.notifications.map((notification) => ({
            type: notification.type,
            message: notification.message,
          })) ?? [],
        refresh_required: false,
        courses: [],
        public_courses: [],
      };
    }

    const accessRows = await this.prisma.organizationCourseAccess.findMany({
      where: { org_id: payload.org_id },
      include: {
        course: {
          include: {
            levels: {
              include: { lessons: true },
            },
          },
        },
      },
    });

    if (accessRows.length === 0) {
      return {
        status: 'LOCKED',
        lock_reason: 'ACCESS_REMOVED',
        license_status: licenseStatus,
        days_remaining: licenseInfo?.days_remaining ?? null,
        notifications:
          licenseInfo?.notifications.map((notification) => ({
            type: notification.type,
            message: notification.message,
          })) ?? [],
        refresh_required: false,
        courses: [],
        public_courses: [],
      };
    }

    const courses = accessRows.map((access) =>
      this.formatCourseForOrg(access),
    );

    const publicCourses = await this.prisma.course.findMany({
      where: { is_public: true },
      include: {
        levels: {
          include: {
            lessons: true,
          },
        },
      },
    });

    return {
      status: 'OK',
      license_status: licenseStatus,
      days_remaining: licenseInfo?.days_remaining ?? null,
      notifications:
        licenseInfo?.notifications.map((notification) => ({
          type: notification.type,
          message: notification.message,
        })) ?? [],
      refresh_required: false,
      courses,
      public_courses: publicCourses.map((course) =>
        this.formatCoursePublic(course),
      ),
    };
  }

  async refresh(payload: JwtPayload) {
    const response = await this.sync(payload);
    return {
      ...response,
      refresh_required: true,
    };
  }

  private formatCourseForOrg(
    access: OrganizationCourseAccess & { course: CourseWithLevels },
  ) {
    const allowedLevels = Array.isArray(access.allowed_levels)
      ? (access.allowed_levels as number[])
      : [];

    const levels = access.course.levels
      .filter((level) => allowedLevels.includes(level.sequence_no))
      .map((level) => this.formatLevel(level, level.lessons));

    return {
      id: access.course.id,
      course_code: access.course.course_code,
      course_name: access.course.course_name,
      levels,
    };
  }

  private formatCoursePublic(course: CourseWithLevels) {
    const publicLevels = course.levels.map((level) => {
      const lessons = level.lessons.filter((lesson) => lesson.is_public);
      return this.formatLevel(level, lessons);
    });

    return {
      id: course.id,
      course_code: course.course_code,
      course_name: course.course_name,
      levels: publicLevels,
    };
  }

  private formatLevel(level: CourseLevel, lessons: Lesson[]) {
    return {
      id: level.id,
      level_name: level.level_name,
      sequence_no: level.sequence_no,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        lesson_name: lesson.lesson_name,
        content_type: lesson.content_type,
        content_url: lesson.content_url,
        is_public: lesson.is_public,
        updated_at: lesson.updated_at,
      })),
    };
  }
}
