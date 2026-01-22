import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

  async create(dto: CreateOrganizationDto, actorUserId: number) {
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        region: dto.region,
      },
    });

    await this.audit.logOrganizationCreated(actorUserId, organization.id);
    return organization;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }
}
