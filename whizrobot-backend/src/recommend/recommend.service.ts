import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RecommendResponse = {
  matched: boolean;
  course?: {
    course_id: number;
    course_name: string;
    owned: boolean;
  };
  lesson?: {
    lesson_id: number;
    lesson_name: string;
    content_url: string | null;
    preview_only: boolean;
  };
  cta?: string;
};

@Injectable()
export class RecommendService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(query: string, orgId?: number): Promise<RecommendResponse> {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new BadRequestException('query is required');
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        lesson_name: {
          contains: trimmed,
        },
      },
      include: {
        courseLevel: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    if (!lesson) {
      return { matched: false };
    }

    const course = lesson.courseLevel.course;
    const owned = await this.isCourseOwned(course.id, orgId);
    const canAccessFull = owned || (course.is_public && lesson.is_public);

    const response: RecommendResponse = {
      matched: true,
      course: {
        course_id: course.id,
        course_name: course.course_name,
        owned,
      },
      lesson: {
        lesson_id: lesson.id,
        lesson_name: lesson.lesson_name,
        content_url: canAccessFull ? lesson.content_url : null,
        preview_only: !canAccessFull,
      },
    };

    if (!owned) {
      response.cta = 'Contact sales to unlock full course';
    }

    return response;
  }

  private async isCourseOwned(courseId: number, orgId?: number) {
    if (orgId == null) {
      return false;
    }

    const access = await this.prisma.organizationCourseAccess.findUnique({
      where: {
        org_id_course_id: {
          org_id: orgId,
          course_id: courseId,
        },
      },
    });

    return Boolean(access);
  }
}
