import { Injectable, NotFoundException } from '@nestjs/common';
import { LicenseNotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LicenseStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED';

export type LicenseStatusResult = {
  status: LicenseStatus;
  days_remaining: number | null;
  notifications: Array<{
    type: LicenseNotificationType;
    message: string;
    created_at: Date;
    acknowledged: boolean;
  }>;
  license_id: number;
  org_id: number;
  robot_id: number;
};

@Injectable()
export class LicenseStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatusForLicense(licenseId: number): Promise<LicenseStatusResult> {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return this.buildStatus(license);
  }

  async getStatusForRobot(robotId: number): Promise<LicenseStatusResult | null> {
    const license = await this.prisma.license.findFirst({
      where: { robot_id: robotId },
      orderBy: { valid_until: 'desc' },
    });

    if (!license) {
      return null;
    }

    return this.buildStatus(license);
  }

  private async buildStatus(license: {
    id: number;
    org_id: number;
    robot_id: number;
    is_active: boolean;
    valid_from: Date;
    valid_until: Date;
  }): Promise<LicenseStatusResult> {
    const now = new Date();

    if (!license.is_active) {
      const notifications = await this.listNotifications(license.id);
      return {
        status: 'REVOKED',
        days_remaining: null,
        notifications,
        license_id: license.id,
        org_id: license.org_id,
        robot_id: license.robot_id,
      };
    }

    const daysRemaining = Math.ceil(
      (license.valid_until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let status: LicenseStatus = 'ACTIVE';
    if (license.valid_until < now || license.valid_from > now) {
      status = 'EXPIRED';
    } else if (daysRemaining <= 30) {
      status = 'EXPIRING_SOON';
    }

    await this.ensureNotification(license, status, daysRemaining);
    const notifications = await this.listNotifications(license.id);

    return {
      status,
      days_remaining: daysRemaining,
      notifications,
      license_id: license.id,
      org_id: license.org_id,
      robot_id: license.robot_id,
    };
  }

  private async ensureNotification(
    license: { id: number; org_id: number; robot_id: number; is_active: boolean },
    status: LicenseStatus,
    daysRemaining: number,
  ) {
    if (!license.is_active) {
      return;
    }

    if (status === 'EXPIRED') {
      await this.createNotificationOnce(
        license,
        'EXPIRED',
        'License has expired',
      );
      return;
    }

    if (status === 'EXPIRING_SOON') {
      if (daysRemaining <= 7) {
        await this.createNotificationOnce(
          license,
          'WARNING_7_DAYS',
          'License expires in 7 days',
        );
      } else if (daysRemaining <= 30) {
        await this.createNotificationOnce(
          license,
          'WARNING_30_DAYS',
          'License expires in 30 days',
        );
      }
    }
  }

  private async createNotificationOnce(
    license: { id: number; org_id: number; robot_id: number },
    type: LicenseNotificationType,
    message: string,
  ) {
    const existing = await this.prisma.licenseNotification.findFirst({
      where: {
        license_id: license.id,
        type,
      },
    });

    if (existing) {
      return;
    }

    await this.prisma.licenseNotification.create({
      data: {
        org_id: license.org_id,
        robot_id: license.robot_id,
        license_id: license.id,
        type,
        message,
      },
    });
  }

  private async listNotifications(licenseId: number) {
    return this.prisma.licenseNotification.findMany({
      where: { license_id: licenseId },
      orderBy: { created_at: 'desc' },
      select: {
        type: true,
        message: true,
        created_at: true,
        acknowledged: true,
      },
    });
  }
}
