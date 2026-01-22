import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { AdminAuditLogService } from '../src/audit/admin-audit-log.service';
import { LicenseStatusService } from '../src/licenses/license-status.service';

const JWT_SECRET = 'testsecret';

const makeJwt = (payload: Record<string, unknown>) => {
  const jwtService = new JwtService({ secret: JWT_SECRET });
  return jwtService.sign(payload);
};

describe('Step 10 Integration (guards, licenses, robots, content, recommend)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  describe('Auth + permission guards', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(OrganizationsService)
        .useValue({
          create: jest.fn().mockResolvedValue({ id: 1, name: 'Org' }),
          findAll: jest.fn().mockResolvedValue([]),
          findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Org' }),
        })
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects requests without auth token', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'Org', type: 'School', region: 'NA' })
        .expect(401);
    });

    it('rejects requests without required permissions', async () => {
      const token = makeJwt({
        sub: 1,
        org_id: null,
        token_type: 'USER',
        permissions: [],
        license_expiry: null,
        is_superadmin: false,
      });

      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Org', type: 'School', region: 'NA' })
        .expect(403);
    });

    it('allows requests with required permissions', async () => {
      const token = makeJwt({
        sub: 1,
        org_id: null,
        token_type: 'USER',
        permissions: ['CREATE_ORG'],
        license_expiry: null,
        is_superadmin: false,
      });

      await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Org', type: 'School', region: 'NA' })
        .expect(201);
    });
  });

  describe('License expiry behavior', () => {
    let app: INestApplication;
    const notifications: Array<{
      license_id: number;
      type: string;
      message: string;
      created_at: Date;
      acknowledged: boolean;
    }> = [];

    beforeAll(async () => {
      const prismaMock = {
        license: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1,
            org_id: 10,
            robot_id: 5,
            is_active: true,
            valid_from: new Date(Date.now() - 24 * 60 * 60 * 1000),
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        },
        licenseNotification: {
          findFirst: jest.fn().mockImplementation(({ where }) =>
            notifications.find(
              (item) => item.license_id === where.license_id && item.type === where.type,
            ) ?? null,
          ),
          create: jest.fn().mockImplementation(({ data }) => {
            notifications.push({
              license_id: data.license_id,
              type: data.type,
              message: data.message,
              created_at: new Date(),
              acknowledged: false,
            });
            return data;
          }),
          findMany: jest.fn().mockImplementation(({ where }) =>
            notifications.filter((item) => item.license_id === where.license_id),
          ),
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns expiring status and creates notifications', async () => {
      const token = makeJwt({
        sub: 1,
        org_id: 10,
        token_type: 'USER',
        permissions: ['VIEW_LICENSE_STATUS'],
        license_expiry: null,
        is_superadmin: true,
      });

      const response = await request(app.getHttpServer())
        .get('/licenses/1/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('EXPIRING_SOON');
      expect(response.body.notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Robot lock-switch behavior', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(LicenseStatusService)
        .useValue({
          getStatusForRobot: jest.fn().mockResolvedValue({
            status: 'EXPIRED',
            days_remaining: 0,
            notifications: [
              { type: 'EXPIRED', message: 'License expired' },
            ],
          }),
        })
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('locks robot when license expired', async () => {
      const token = makeJwt({
        sub: 55,
        org_id: 10,
        token_type: 'ROBOT',
        permissions: [],
        license_expiry: new Date().toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/robot/sync')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('LOCKED');
      expect(response.body.lock_reason).toBe('EXPIRED');
    });
  });

  describe('CSV ingestion success/failure', () => {
    let app: INestApplication;

    const prismaState = {
      courses: [] as Array<{ id: number; course_name: string; source: string; course_code: string }>,
      levels: [] as Array<{ id: number; course_id: number; level_name: string; sequence_no: number }>,
      lessons: [] as Array<{ id: number; course_level_id: number; lesson_name: string }>,
      access: [] as Array<{ org_id: number; course_id: number; allowed_levels: number[] }>,
    };

    const prismaMock = {
      course: {
        findFirst: jest.fn().mockImplementation((args) => {
          if (args?.select?.id) {
            const last = prismaState.courses[prismaState.courses.length - 1];
            return last ? { id: last.id } : null;
          }
          return (
            prismaState.courses.find(
              (course) =>
                course.course_name === args.where.course_name &&
                course.source === args.where.source,
            ) ?? null
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newCourse = {
            id: prismaState.courses.length + 1,
            course_name: data.course_name,
            source: data.source,
            course_code: data.course_code,
          };
          prismaState.courses.push(newCourse);
          return newCourse;
        }),
      },
      courseLevel: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return (
            prismaState.levels.find(
              (level) =>
                level.course_id === where.course_id &&
                level.level_name === where.level_name,
            ) ?? null
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newLevel = {
            id: prismaState.levels.length + 1,
            course_id: data.course_id,
            level_name: data.level_name,
            sequence_no: data.sequence_no,
          };
          prismaState.levels.push(newLevel);
          return newLevel;
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const level = prismaState.levels.find((item) => item.id === where.id);
          if (level) {
            level.sequence_no = data.sequence_no;
          }
          return level;
        }),
      },
      lesson: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return (
            prismaState.lessons.find(
              (lesson) =>
                lesson.course_level_id === where.course_level_id &&
                lesson.lesson_name === where.lesson_name,
            ) ?? null
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newLesson = {
            id: prismaState.lessons.length + 1,
            course_level_id: data.course_level_id,
            lesson_name: data.lesson_name,
          };
          prismaState.lessons.push(newLesson);
          return newLesson;
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      organizationCourseAccess: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create, update }) => {
          const existing = prismaState.access.find(
            (item) =>
              item.org_id === create.org_id && item.course_id === create.course_id,
          );
          if (existing) {
            existing.allowed_levels = update.allowed_levels;
            return existing;
          }
          const newAccess = {
            org_id: create.org_id,
            course_id: create.course_id,
            allowed_levels: create.allowed_levels,
          };
          prismaState.access.push(newAccess);
          return newAccess;
        }),
      },
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .overrideProvider(AdminAuditLogService)
        .useValue({
          logContentUpload: jest.fn(),
          logCourseCreated: jest.fn(),
          logLevelCreated: jest.fn(),
          logLessonCreated: jest.fn(),
          logLessonUpdated: jest.fn(),
        })
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('ingests valid CSV upload', async () => {
      const token = makeJwt({
        sub: 1,
        org_id: 5,
        token_type: 'USER',
        permissions: ['UPLOAD_ORG_CONTENT'],
        license_expiry: null,
        is_superadmin: true,
      });

      const csv = [
        'course_name,level_name,level_sequence,lesson_name,content_type,content_url,is_public',
        'Math 101,Level 1,1,Intro,VIDEO,https://example.com,true',
      ].join('\n');

      await request(app.getHttpServer())
        .post('/content/org/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(csv), {
          filename: 'content.csv',
          contentType: 'text/csv',
        })
        .expect(201);
    });

    it('rejects invalid CSV upload', async () => {
      const token = makeJwt({
        sub: 1,
        org_id: 5,
        token_type: 'USER',
        permissions: ['UPLOAD_ORG_CONTENT'],
        license_expiry: null,
        is_superadmin: true,
      });

      const csv = [
        'course_name,level_sequence,lesson_name,content_type,content_url,is_public',
        'Math 101,1,Intro,VIDEO,https://example.com,true',
      ].join('\n');

      await request(app.getHttpServer())
        .post('/content/org/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(csv), {
          filename: 'content.csv',
          contentType: 'text/csv',
        })
        .expect(400);
    });
  });

  describe('Recommendation access enforcement', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const prismaMock = {
        lesson: {
          findFirst: jest.fn().mockResolvedValue({
            id: 99,
            lesson_name: 'Pythagoras Theorem',
            content_url: 'https://example.com/lesson',
            is_public: false,
            updated_at: new Date(),
            courseLevel: {
              course: {
                id: 12,
                course_name: 'Geometry Basics',
                is_public: false,
              },
            },
          }),
        },
        organizationCourseAccess: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns preview-only response when org does not own course', async () => {
      const response = await request(app.getHttpServer())
        .post('/recommend')
        .send({ query: 'Pythagoras', org_id: 5 })
        .expect(201);

      expect(response.body.lesson.preview_only).toBe(true);
      expect(response.body.lesson.content_url).toBeNull();
      expect(response.body.cta).toBeTruthy();
    });
  });
});
