import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { CreateOrganizationDto, RoleDto } from './dto/create-organization.dto';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

  async create(
    dto: CreateOrganizationDto,
    actorUserId: number,
    roles: RoleDto[] = [],
  ) {
    if (!dto.name || !dto.type || !dto.region) {
      throw new BadRequestException('Organization details are required');
    }

    const name = dto.name;
    const type = dto.type;
    const region = dto.region;

    const { organization, rolesCreated } = await this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            type,
            region,
          },
        });

        let rolesCreated = 0;
        for (const role of roles) {
          const createdRole = await tx.role.create({
            data: {
              name: role.name,
              org_id: organization.id,
            },
          });
          rolesCreated += 1;

          for (const permissionKey of role.permissions) {
            await tx.rolePermission.create({
              data: {
                role_id: createdRole.id,
                permission_key: permissionKey,
              },
            });
          }
        }

        return { organization, rolesCreated };
      },
    );

    await this.audit.logOrganizationCreated(actorUserId, organization.id);
    return {
      organization_id: organization.id,
      roles_created: rolesCreated,
    };
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

  async listRoles(orgId: number) {
    return this.prisma.role.findMany({
      where: { org_id: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(
    orgId: number,
    dto: CreateOrgUserDto,
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.role_id },
    });

    if (!role || role.org_id !== orgId) {
      throw new BadRequestException('Role not found for organization');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        org_id: orgId,
        role_id: role.id,
        is_active: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      org_id: user.org_id,
      role_id: user.role_id,
    };
  }
}
