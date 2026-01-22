import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { CourseSource, ContentType } from '@prisma/client';

type UploadContext = {
  fileBuffer: Buffer;
  actorUserId: number;
  source: CourseSource;
  orgId: number | null;
};

type ParsedRow = {
  course_name: string;
  level_name: string;
  level_sequence: number;
  lesson_name: string;
  content_type: ContentType;
  content_url: string;
  is_public: boolean;
};

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

  async processUpload(context: UploadContext) {
    const rows = this.parseCsv(context.fileBuffer);
    if (rows.length === 0) {
      throw new BadRequestException('CSV must contain at least one row');
    }

    await this.audit.logContentUpload(context.actorUserId);

    const summary = {
      coursesCreated: 0,
      levelsCreated: 0,
      lessonsCreated: 0,
      lessonsUpdated: 0,
    };

    const courseCache = new Map<string, { id: number; source: CourseSource }>();
    const levelCache = new Map<string, { id: number }>();
    const orgLevelMap = new Map<number, Set<number>>();

    let nextCourseNumber = await this.getNextCourseNumber();

    for (const row of rows) {
      const courseKey = this.getCourseKey(
        row.course_name,
        context.source,
        context.orgId,
      );

      let courseEntry = courseCache.get(courseKey);
      if (!courseEntry) {
        const existingCourse = await this.findExistingCourse(
          row.course_name,
          context.source,
          context.orgId,
        );

        if (existingCourse) {
          courseEntry = { id: existingCourse.id, source: existingCourse.source };
        } else {
          const course = await this.prisma.course.create({
            data: {
              course_code: this.formatCourseCode(nextCourseNumber++),
              course_name: row.course_name,
              is_public: false,
              source: context.source,
            },
          });
          courseEntry = { id: course.id, source: course.source };
          summary.coursesCreated += 1;
          await this.audit.logCourseCreated(context.actorUserId, course.id);
        }

        courseCache.set(courseKey, courseEntry);
      }

      if (context.orgId != null) {
        const levelSet =
          orgLevelMap.get(courseEntry.id) ?? new Set<number>();
        levelSet.add(row.level_sequence);
        orgLevelMap.set(courseEntry.id, levelSet);
      }

      const levelKey = `${courseEntry.id}:${row.level_name.toLowerCase()}`;
      let levelEntry = levelCache.get(levelKey);
      if (!levelEntry) {
        let level = await this.prisma.courseLevel.findFirst({
          where: {
            course_id: courseEntry.id,
            level_name: row.level_name,
          },
        });

        if (!level) {
          level = await this.prisma.courseLevel.create({
            data: {
              course_id: courseEntry.id,
              level_name: row.level_name,
              sequence_no: row.level_sequence,
            },
          });
          summary.levelsCreated += 1;
          await this.audit.logLevelCreated(context.actorUserId, level.id);
        } else if (level.sequence_no !== row.level_sequence) {
          level = await this.prisma.courseLevel.update({
            where: { id: level.id },
            data: {
              sequence_no: row.level_sequence,
            },
          });
        }

        levelEntry = { id: level.id };
        levelCache.set(levelKey, levelEntry);
      }

      const existingLesson = await this.prisma.lesson.findFirst({
        where: {
          course_level_id: levelEntry.id,
          lesson_name: row.lesson_name,
        },
      });

      if (!existingLesson) {
        const lesson = await this.prisma.lesson.create({
          data: {
            course_level_id: levelEntry.id,
            lesson_name: row.lesson_name,
            content_type: row.content_type,
            content_url: row.content_url,
            is_public: row.is_public,
          },
        });
        summary.lessonsCreated += 1;
        await this.audit.logLessonCreated(context.actorUserId, lesson.id);
      } else {
        await this.prisma.lesson.update({
          where: { id: existingLesson.id },
          data: {
            content_type: row.content_type,
            content_url: row.content_url,
            is_public: row.is_public,
          },
        });
        summary.lessonsUpdated += 1;
        await this.audit.logLessonUpdated(context.actorUserId, existingLesson.id);
      }
    }

    if (context.orgId != null) {
      for (const [courseId, levelSet] of orgLevelMap.entries()) {
        await this.prisma.organizationCourseAccess.upsert({
          where: {
            org_id_course_id: { org_id: context.orgId, course_id: courseId },
          },
          create: {
            org_id: context.orgId,
            course_id: courseId,
            allowed_levels: Array.from(levelSet.values()),
          },
          update: {
            allowed_levels: Array.from(levelSet.values()),
          },
        });
      }
    }

    return summary;
  }

  private parseCsv(buffer: Buffer): ParsedRow[] {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const errors: string[] = [];
    const rows: ParsedRow[] = [];
    const requiredColumns = [
      'course_name',
      'level_name',
      'level_sequence',
      'lesson_name',
      'content_type',
      'content_url',
      'is_public',
    ];

    records.forEach((record: Record<string, string>, index: number) => {
      const rowErrors: string[] = [];
      const rowNumber = index + 2;

      for (const column of requiredColumns) {
        if (!(column in record)) {
          rowErrors.push(`Row ${rowNumber}: Missing column ${column}`);
        }
      }

      const course_name = record.course_name?.trim();
      const level_name = record.level_name?.trim();
      const lesson_name = record.lesson_name?.trim();
      const content_url = record.content_url?.trim();
      const level_sequence = Number.parseInt(record.level_sequence, 10);
      const content_type = record.content_type?.trim().toUpperCase();
      const is_public = this.parseBoolean(record.is_public);

      if (!course_name) {
        rowErrors.push(`Row ${rowNumber}: course_name is required`);
      }
      if (!level_name) {
        rowErrors.push(`Row ${rowNumber}: level_name is required`);
      }
      if (!lesson_name) {
        rowErrors.push(`Row ${rowNumber}: lesson_name is required`);
      }
      if (!content_url) {
        rowErrors.push(`Row ${rowNumber}: content_url is required`);
      }
      if (Number.isNaN(level_sequence)) {
        rowErrors.push(`Row ${rowNumber}: level_sequence must be a number`);
      }

      if (!content_type || !this.isValidContentType(content_type)) {
        rowErrors.push(`Row ${rowNumber}: content_type is invalid`);
      }
      if (is_public === null) {
        rowErrors.push(`Row ${rowNumber}: is_public must be true/false`);
      }

      if (rowErrors.length === 0) {
        rows.push({
          course_name,
          level_name,
          level_sequence,
          lesson_name,
          content_type: content_type as ContentType,
          content_url,
          is_public: is_public as boolean,
        });
      } else {
        errors.push(...rowErrors);
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid CSV',
        errors,
      });
    }

    return rows;
  }

  private parseBoolean(value?: string) {
    if (value == null) {
      return null;
    }
    const normalized = value.toString().trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
    return null;
  }

  private isValidContentType(value: string): value is ContentType {
    return ['VIDEO', 'IMAGE', 'TEXT'].includes(value);
  }

  private async findExistingCourse(
    courseName: string,
    source: CourseSource,
    orgId: number | null,
  ) {
    if (orgId == null) {
      return this.prisma.course.findFirst({
        where: {
          course_name: courseName,
          source,
        },
      });
    }

    const access = await this.prisma.organizationCourseAccess.findFirst({
      where: {
        org_id: orgId,
        course: {
          course_name: courseName,
          source,
        },
      },
      include: {
        course: true,
      },
    });

    return access?.course ?? null;
  }

  private async getNextCourseNumber() {
    const lastCourse = await this.prisma.course.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return lastCourse ? lastCourse.id + 1 : 1;
  }

  private formatCourseCode(numberValue: number) {
    return `C${numberValue.toString().padStart(5, '0')}`;
  }

  private getCourseKey(
    courseName: string,
    source: CourseSource,
    orgId: number | null,
  ) {
    return `${source}:${orgId ?? 'null'}:${courseName.toLowerCase()}`;
  }
}
