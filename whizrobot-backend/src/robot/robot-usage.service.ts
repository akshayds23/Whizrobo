import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

type UsageLogInput = {
  course_id: number;
  lesson_id?: number;
  opened_at: string;
  duration_seconds: number;
};

@Injectable()
export class RobotUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async ingestLogs(payload: JwtPayload, body: unknown) {
    if (!Array.isArray(body)) {
      throw new BadRequestException('Payload must be an array');
    }

    await this.assertLicenseValid(payload.sub);

    const parsed = body.map((entry, index) => this.parseEntry(entry, index));

    const seen = new Set<string>();
    let inserted = 0;
    let skipped = 0;

    for (const entry of parsed) {
      const key = `${payload.sub}:${entry.course_id}:${entry.lesson_id ?? 'null'}:${entry.opened_at.toISOString()}`;
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);

      const existing = await this.prisma.robotUsageLog.findFirst({
        where: {
          robot_id: payload.sub,
          course_id: entry.course_id,
          lesson_id: entry.lesson_id ?? null,
          opened_at: entry.opened_at,
        },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await this.prisma.robotUsageLog.create({
        data: {
          robot_id: payload.sub,
          course_id: entry.course_id,
          lesson_id: entry.lesson_id ?? null,
          opened_at: entry.opened_at,
          duration_seconds: entry.duration_seconds,
        },
      });
      inserted += 1;
    }

    return {
      received: parsed.length,
      inserted,
      skipped,
    };
  }

  private parseEntry(entry: unknown, index: number) {
    if (!entry || typeof entry !== 'object') {
      throw new BadRequestException(`Row ${index + 1}: invalid entry`);
    }

    const record = entry as Partial<UsageLogInput>;
    const courseId = Number(record.course_id);
    const lessonId =
      record.lesson_id === undefined || record.lesson_id === null
        ? null
        : Number(record.lesson_id);
    const durationSeconds = Number(record.duration_seconds);
    const openedAt = new Date(record.opened_at ?? '');

    if (!Number.isFinite(courseId) || courseId <= 0) {
      throw new BadRequestException(`Row ${index + 1}: course_id invalid`);
    }
    if (lessonId !== null && (!Number.isFinite(lessonId) || lessonId <= 0)) {
      throw new BadRequestException(`Row ${index + 1}: lesson_id invalid`);
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      throw new BadRequestException(
        `Row ${index + 1}: duration_seconds invalid`,
      );
    }
    if (Number.isNaN(openedAt.getTime())) {
      throw new BadRequestException(`Row ${index + 1}: opened_at invalid`);
    }

    return {
      course_id: courseId,
      lesson_id: lessonId ?? undefined,
      opened_at: openedAt,
      duration_seconds: durationSeconds,
    };
  }

  private async assertLicenseValid(robotId: number) {
    const license = await this.prisma.license.findFirst({
      where: { robot_id: robotId },
      orderBy: { valid_until: 'desc' },
    });

    if (!license || !license.is_active) {
      throw new ForbiddenException('License revoked');
    }

    const now = new Date();
    if (license.valid_from > now || license.valid_until < now) {
      throw new ForbiddenException('License expired');
    }
  }
}
