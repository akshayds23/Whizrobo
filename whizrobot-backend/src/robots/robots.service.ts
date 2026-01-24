import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { LicenseStatusService } from '../licenses/license-status.service';

@Injectable()
export class RobotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseStatusService: LicenseStatusService,
  ) {}

  async listRobots(user: JwtPayload) {
    const where = user.is_superadmin
      ? {}
      : user.org_id
      ? { org_id: user.org_id }
      : { id: -1 };

    const robots = await this.prisma.robot.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    const items = await Promise.all(
      robots.map(async (robot) => {
        const licenseInfo = await this.licenseStatusService.getStatusForRobot(
          robot.id,
        );
        const licenseStatus = licenseInfo?.status ?? 'REVOKED';
        return {
          robot_id: robot.id,
          robot_code: robot.robot_code,
          license_status: licenseStatus,
          days_remaining: licenseInfo?.days_remaining ?? null,
          last_sync_at: robot.last_sync_at,
        };
      }),
    );

    return { items };
  }

  async requestRefresh(robotId: number) {
    const robot = await this.prisma.robot.findUnique({
      where: { id: robotId },
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    await this.prisma.robot.update({
      where: { id: robotId },
      data: { refresh_required: true },
    });

    return { robot_id: robotId, refresh_required: true };
  }

  async lockRobot(robotId: number) {
    const robot = await this.prisma.robot.findUnique({
      where: { id: robotId },
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    const license = await this.prisma.license.findFirst({
      where: { robot_id: robotId, is_active: true },
      orderBy: { valid_until: 'desc' },
    });

    if (license) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { is_active: false },
      });
    }

    return { robot_id: robotId, locked: true };
  }
}
