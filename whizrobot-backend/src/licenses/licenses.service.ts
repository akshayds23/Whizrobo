import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { CreateLicenseDto } from './dto/create-license.dto';

@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

  async issueLicense(dto: CreateLicenseDto, actorUserId: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.org_id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const robot = await this.prisma.robot.findUnique({
      where: { id: dto.robot_id },
    });
    if (!robot) {
      throw new NotFoundException('Robot not found');
    }
    if (robot.org_id !== dto.org_id) {
      throw new NotFoundException('Robot not found in organization');
    }

    const license = await this.prisma.license.create({
      data: {
        license_key: randomUUID(),
        org_id: dto.org_id,
        robot_id: dto.robot_id,
        valid_from: new Date(dto.valid_from),
        valid_until: new Date(dto.valid_until),
        is_active: true,
      },
    });

    await this.audit.logLicenseIssued(actorUserId, license.id);
    return license;
  }

  async revokeLicense(id: number, actorUserId: number) {
    const license = await this.prisma.license.findUnique({
      where: { id },
    });
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const updated = await this.prisma.license.update({
      where: { id },
      data: {
        is_active: false,
      },
    });

    await this.audit.logLicenseRevoked(actorUserId, updated.id);
    return updated;
  }
}
