import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = {
  CREATE_ORG: 'CREATE_ORG',
  VIEW_ORG: 'VIEW_ORG',
  ASSIGN_COURSE: 'ASSIGN_COURSE',
  VIEW_ASSIGNED_COURSE: 'VIEW_ASSIGNED_COURSE',
  ISSUE_LICENSE: 'ISSUE_LICENSE',
  REVOKE_LICENSE: 'REVOKE_LICENSE',
  UPLOAD_PLATFORM_CONTENT: 'UPLOAD_PLATFORM_CONTENT',
  UPLOAD_ORG_CONTENT: 'UPLOAD_ORG_CONTENT',
  VIEW_LICENSE_STATUS: 'VIEW_LICENSE_STATUS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_ROBOTS: 'MANAGE_ROBOTS',
};

async function main() {
  console.log('Seeding database...');

  // 1) Permissions
  const permissions = [
    { key: PERMISSIONS.CREATE_ORG, desc: 'Create organization' },
    { key: PERMISSIONS.VIEW_ORG, desc: 'View organization' },
    { key: PERMISSIONS.ASSIGN_COURSE, desc: 'Assign course to organization' },
    { key: PERMISSIONS.VIEW_ASSIGNED_COURSE, desc: 'View assigned courses' },
    { key: PERMISSIONS.ISSUE_LICENSE, desc: 'Issue robot license' },
    { key: PERMISSIONS.REVOKE_LICENSE, desc: 'Revoke robot license' },
    { key: PERMISSIONS.UPLOAD_PLATFORM_CONTENT, desc: 'Upload platform content' },
    { key: PERMISSIONS.UPLOAD_ORG_CONTENT, desc: 'Upload org content' },
    { key: PERMISSIONS.VIEW_LICENSE_STATUS, desc: 'View license status' },
    { key: PERMISSIONS.VIEW_AUDIT_LOGS, desc: 'View audit logs' },
    { key: PERMISSIONS.MANAGE_ROBOTS, desc: 'Manage robots' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { permission_key: perm.key },
      update: { description: perm.desc },
      create: {
        permission_key: perm.key,
        description: perm.desc,
      },
    });
  }

  // 2) Super Admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@whizrobo.com' },
    update: { password_hash: passwordHash },
    create: {
      email: 'superadmin@whizrobo.com',
      password_hash: passwordHash,
      is_superadmin: true,
      is_active: true,
    },
  });

  // 3) Organizations
  const whizroboInternal = await upsertOrganization('Whizrobo Internal', 'Global', 'Corporate');
  const demoSchool = await upsertOrganization('Demo School', 'India', 'Education');
  const demoCorporate = await upsertOrganization('Demo Corporate', 'USA', 'Corporate');

  // 4) Roles (org-scoped)
  const whizRoles = await seedRoles(whizroboInternal.id, [
    {
      name: 'Sales Admin',
      permissions: [
        PERMISSIONS.CREATE_ORG,
        PERMISSIONS.VIEW_ORG,
        PERMISSIONS.VIEW_AUDIT_LOGS,
        PERMISSIONS.MANAGE_ROBOTS,
        PERMISSIONS.ISSUE_LICENSE,
      ],
    },
    {
      name: 'Org Admin',
      permissions: [
        PERMISSIONS.CREATE_ORG,
        PERMISSIONS.VIEW_ORG,
        PERMISSIONS.ASSIGN_COURSE,
        PERMISSIONS.ISSUE_LICENSE,
        PERMISSIONS.VIEW_AUDIT_LOGS,
      ],
    },
    {
      name: 'Robot Role',
      permissions: [PERMISSIONS.MANAGE_ROBOTS],
    },
  ]);

  const schoolRoles = await seedRoles(demoSchool.id, [
    {
      name: 'Org Admin',
      permissions: [
        PERMISSIONS.CREATE_ORG,
        PERMISSIONS.VIEW_ORG,
        PERMISSIONS.ASSIGN_COURSE,
        PERMISSIONS.ISSUE_LICENSE,
        PERMISSIONS.VIEW_AUDIT_LOGS,
      ],
    },
    {
      name: 'Content Manager',
      permissions: [PERMISSIONS.UPLOAD_ORG_CONTENT],
    },
    {
      name: 'Viewer',
      permissions: [PERMISSIONS.VIEW_ORG],
    },
    {
      name: 'Robot Role',
      permissions: [PERMISSIONS.MANAGE_ROBOTS],
    },
  ]);

  const corporateRoles = await seedRoles(demoCorporate.id, [
    {
      name: 'Org Admin',
      permissions: [
        PERMISSIONS.CREATE_ORG,
        PERMISSIONS.VIEW_ORG,
        PERMISSIONS.ASSIGN_COURSE,
        PERMISSIONS.ISSUE_LICENSE,
      ],
    },
    {
      name: 'Viewer',
      permissions: [PERMISSIONS.VIEW_ORG],
    },
    {
      name: 'Robot Role',
      permissions: [PERMISSIONS.MANAGE_ROBOTS],
    },
  ]);

  // 5) Users with role assignment
  await upsertUser('sales@whizrobo.com', passwordHash, whizroboInternal.id, whizRoles['Sales Admin'].id);
  await upsertUser('admin@school.com', passwordHash, demoSchool.id, schoolRoles['Org Admin'].id);
  await upsertUser('content@school.com', passwordHash, demoSchool.id, schoolRoles['Content Manager'].id);
  await upsertUser('viewer@school.com', passwordHash, demoSchool.id, schoolRoles['Viewer'].id);
  await upsertUser('robot@school.com', passwordHash, demoSchool.id, schoolRoles['Robot Role'].id);

  // 6) Courses (platform + org private)
  const courseMath = await upsertCourse('C00001', 'Math Basics', true, 'WHIZROBOT');
  const courseScience = await upsertCourse('C00002', 'Science Explorer', true, 'WHIZROBOT');
  const courseRobotics = await upsertCourse('C00003', 'Robotics 101', true, 'WHIZROBOT');
  const courseSchoolPrivate = await upsertCourse('C01001', 'School Algebra', false, 'SCHOOL');

  // 7) Levels
  const mathLevel1 = await upsertCourseLevel(courseMath.id, 1, 'Level 1');
  const mathLevel2 = await upsertCourseLevel(courseMath.id, 2, 'Level 2');
  const scienceLevel1 = await upsertCourseLevel(courseScience.id, 1, 'Level 1');
  const scienceLevel2 = await upsertCourseLevel(courseScience.id, 2, 'Level 2');
  const roboticsLevel1 = await upsertCourseLevel(courseRobotics.id, 1, 'Level 1');
  const schoolLevel1 = await upsertCourseLevel(courseSchoolPrivate.id, 1, 'Level 1');

  // 8) Lessons (public intro + private)
  await upsertLesson(mathLevel1.id, 'Intro to Numbers', 'VIDEO', 'https://example.com/math/intro', true);
  await upsertLesson(mathLevel1.id, 'Number Patterns', 'TEXT', 'https://example.com/math/patterns', false);
  await upsertLesson(mathLevel2.id, 'Fractions Basics', 'VIDEO', 'https://example.com/math/fractions', false);
  await upsertLesson(scienceLevel1.id, 'Intro to Science', 'VIDEO', 'https://example.com/science/intro', true);
  await upsertLesson(scienceLevel2.id, 'Energy and Motion', 'VIDEO', 'https://example.com/science/energy', false);
  await upsertLesson(roboticsLevel1.id, 'Robotics Overview', 'VIDEO', 'https://example.com/robotics/intro', true);
  await upsertLesson(schoolLevel1.id, 'Algebra Warmup', 'VIDEO', 'https://example.com/school/algebra', true);
  await upsertLesson(schoolLevel1.id, 'Linear Equations', 'VIDEO', 'https://example.com/school/linear', false);

  // 9) OrganizationCourseAccess
  await upsertCourseAccess(demoSchool.id, courseMath.id, [1, 2]);
  await upsertCourseAccess(demoSchool.id, courseScience.id, [1]);
  await upsertCourseAccess(demoSchool.id, courseSchoolPrivate.id, [1]);
  await upsertCourseAccess(demoCorporate.id, courseMath.id, [1]);
  await upsertCourseAccess(demoCorporate.id, courseRobotics.id, [1]);

  // 10) Robots
  const robotWhiz1 = await upsertRobot('RB-WHIZ-01', whizroboInternal.id);
  const robotWhiz2 = await upsertRobot('RB-WHIZ-02', whizroboInternal.id);
  const robotSchool1 = await upsertRobot('RB-SCHOOL-01', demoSchool.id);
  const robotSchool2 = await upsertRobot('RB-SCHOOL-02', demoSchool.id);
  const robotCorp1 = await upsertRobot('RB-CORP-01', demoCorporate.id);
  const robotCorp2 = await upsertRobot('RB-CORP-02', demoCorporate.id);

  // 11) Licenses
  const now = Date.now();
  const oneDay = 86400000;

  const activeLicense = await upsertLicense(
    'LIC-ACTIVE-001',
    demoSchool.id,
    robotSchool1.id,
    new Date(now - oneDay),
    new Date(now + 30 * oneDay),
    true,
  );
  const expiringLicense = await upsertLicense(
    'LIC-EXP-007',
    demoSchool.id,
    robotSchool2.id,
    new Date(now - oneDay),
    new Date(now + 7 * oneDay),
    true,
  );
  const expiredLicense = await upsertLicense(
    'LIC-EXP-000',
    demoCorporate.id,
    robotCorp1.id,
    new Date(now - 30 * oneDay),
    new Date(now - oneDay),
    true,
  );
  await upsertLicense(
    'LIC-REV-000',
    demoCorporate.id,
    robotCorp2.id,
    new Date(now - 10 * oneDay),
    new Date(now + 30 * oneDay),
    false,
  );
  await upsertLicense(
    'LIC-WHIZ-001',
    whizroboInternal.id,
    robotWhiz1.id,
    new Date(now - oneDay),
    new Date(now + 60 * oneDay),
    true,
  );
  await upsertLicense(
    'LIC-WHIZ-002',
    whizroboInternal.id,
    robotWhiz2.id,
    new Date(now - oneDay),
    new Date(now + 14 * oneDay),
    true,
  );

  // 12) Audit Logs
  await prisma.adminAuditLog.createMany({
    data: [
      {
        actor_user_id: superAdmin.id,
        action_type: 'ORG_CREATE',
        entity_type: 'Organization',
        entity_id: demoSchool.id,
      },
      {
        actor_user_id: superAdmin.id,
        action_type: 'ROLE_CREATE',
        entity_type: 'Role',
        entity_id: schoolRoles['Org Admin'].id,
      },
      {
        actor_user_id: superAdmin.id,
        action_type: 'LICENSE_ISSUE',
        entity_type: 'License',
        entity_id: activeLicense.id,
      },
      {
        actor_user_id: superAdmin.id,
        action_type: 'ROBOT_LOCK',
        entity_type: 'Robot',
        entity_id: robotCorp2.id,
      },
    ],
  });

  // 13) Robot Usage Logs
  const lessonIntro = await prisma.lesson.findFirst({
    where: { lesson_name: 'Intro to Numbers' },
  });
  if (lessonIntro) {
    await prisma.robotUsageLog.createMany({
      data: [
        {
          robot_id: robotSchool1.id,
          course_id: courseMath.id,
          lesson_id: lessonIntro.id,
          opened_at: new Date(now - oneDay),
          duration_seconds: 180,
        },
        {
          robot_id: robotSchool1.id,
          course_id: courseMath.id,
          lesson_id: lessonIntro.id,
          opened_at: new Date(now - 2 * oneDay),
          duration_seconds: 240,
        },
      ],
    });
  }

  console.log(`
Seed completed successfully

Logins:
Super Admin -> superadmin@whizrobo.com / admin123
Sales/Admin -> sales@whizrobo.com / admin123
Org Admin -> admin@school.com / admin123
Content Manager -> content@school.com / admin123
Viewer -> viewer@school.com / admin123
Robot -> RB-SCHOOL-01 (license active)
`);
}

async function upsertOrganization(name: string, region: string, type: string) {
  const existing = await prisma.organization.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.organization.create({
    data: { name, region, type },
  });
}

async function seedRoles(
  orgId: number,
  roles: Array<{ name: string; permissions: string[] }>,
) {
  const result: Record<string, { id: number; name: string }> = {};

  for (const role of roles) {
    let createdRole = await prisma.role.findFirst({
      where: { org_id: orgId, name: role.name },
    });
    if (!createdRole) {
      createdRole = await prisma.role.create({
        data: { name: role.name, org_id: orgId },
      });
    }

    for (const permissionKey of role.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_key: {
            role_id: createdRole.id,
            permission_key: permissionKey,
          },
        },
        update: {},
        create: {
          role_id: createdRole.id,
          permission_key: permissionKey,
        },
      });
    }

    result[role.name] = { id: createdRole.id, name: createdRole.name };
  }

  return result;
}

async function upsertUser(
  email: string,
  passwordHash: string,
  orgId: number,
  roleId: number,
) {
  return prisma.user.upsert({
    where: { email },
    update: {
      password_hash: passwordHash,
      org_id: orgId,
      role_id: roleId,
      is_active: true,
    },
    create: {
      email,
      password_hash: passwordHash,
      org_id: orgId,
      role_id: roleId,
      is_active: true,
    },
  });
}

async function upsertCourse(
  courseCode: string,
  courseName: string,
  isPublic: boolean,
  source: 'WHIZROBOT' | 'SCHOOL',
) {
  return prisma.course.upsert({
    where: { course_code: courseCode },
    update: { course_name: courseName, is_public: isPublic, source },
    create: {
      course_code: courseCode,
      course_name: courseName,
      is_public: isPublic,
      source,
    },
  });
}

async function upsertCourseLevel(
  courseId: number,
  sequenceNo: number,
  levelName: string,
) {
  return prisma.courseLevel.upsert({
    where: { course_id_sequence_no: { course_id: courseId, sequence_no: sequenceNo } },
    update: { level_name: levelName },
    create: {
      course_id: courseId,
      sequence_no: sequenceNo,
      level_name: levelName,
    },
  });
}

async function upsertLesson(
  courseLevelId: number,
  lessonName: string,
  contentType: 'VIDEO' | 'IMAGE' | 'TEXT',
  contentUrl: string,
  isPublic: boolean,
) {
  const existing = await prisma.lesson.findFirst({
    where: { course_level_id: courseLevelId, lesson_name: lessonName },
  });
  if (existing) {
    return prisma.lesson.update({
      where: { id: existing.id },
      data: {
        content_type: contentType,
        content_url: contentUrl,
        is_public: isPublic,
      },
    });
  }
  return prisma.lesson.create({
    data: {
      course_level_id: courseLevelId,
      lesson_name: lessonName,
      content_type: contentType,
      content_url: contentUrl,
      is_public: isPublic,
    },
  });
}

async function upsertCourseAccess(
  orgId: number,
  courseId: number,
  allowedLevels: number[],
) {
  return prisma.organizationCourseAccess.upsert({
    where: {
      org_id_course_id: {
        org_id: orgId,
        course_id: courseId,
      },
    },
    update: { allowed_levels: allowedLevels },
    create: { org_id: orgId, course_id: courseId, allowed_levels: allowedLevels },
  });
}

async function upsertRobot(robotCode: string, orgId: number) {
  return prisma.robot.upsert({
    where: { robot_code: robotCode },
    update: { org_id: orgId, is_active: true },
    create: { robot_code: robotCode, org_id: orgId, is_active: true },
  });
}

async function upsertLicense(
  licenseKey: string,
  orgId: number,
  robotId: number,
  validFrom: Date,
  validUntil: Date,
  isActive: boolean,
) {
  return prisma.license.upsert({
    where: { license_key: licenseKey },
    update: {
      org_id: orgId,
      robot_id: robotId,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: isActive,
    },
    create: {
      license_key: licenseKey,
      org_id: orgId,
      robot_id: robotId,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: isActive,
    },
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
