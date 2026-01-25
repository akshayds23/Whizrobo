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
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
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

  async listUsers(
    orgId: number,
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const users = await this.prisma.user.findMany({
      where: { org_id: orgId },
      include: {
        role: true,
        permissions: { include: { permission: true } },
      },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role?.name ?? null,
      permissions: user.permissions.map(
        (perm) => perm.permission.permission_key,
      ),
    }));
  }

  async getRolePermissions(
    orgId: number,
    roleId: number,
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    if (!role || role.org_id !== orgId) {
      throw new BadRequestException('Role not found for organization');
    }

    return {
      role_id: role.id,
      permissions: role.permissions.map((perm) => perm.permission_key),
    };
  }

  async updateRolePermissions(
    orgId: number,
    roleId: number,
    dto: UpdateRolePermissionsDto,
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.org_id !== orgId) {
      throw new BadRequestException('Role not found for organization');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role_id: roleId } });
      if (dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((permissionKey) => ({
            role_id: roleId,
            permission_key: permissionKey,
          })),
        });
      }
    });

    return { role_id: roleId, permissions: dto.permissions };
  }

  async updateUserRole(
    orgId: number,
    userId: number,
    roleId: number,
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.org_id !== orgId) {
      throw new BadRequestException('User not found for organization');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role || role.org_id !== orgId) {
      throw new BadRequestException('Role not found for organization');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role_id: roleId },
    });

    return {
      id: updated.id,
      role_id: updated.role_id,
    };
  }

  async updateUserPermissions(
    orgId: number,
    userId: number,
    permissions: string[],
    actorOrgId: number | null,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && actorOrgId !== orgId) {
      throw new ForbiddenException('Cross-organization access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.org_id !== orgId) {
      throw new BadRequestException('User not found for organization');
    }

    const permissionRows = await this.prisma.permission.findMany({
      where: { permission_key: { in: permissions } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { user_id: userId } });
      if (permissionRows.length > 0) {
        await tx.userPermission.createMany({
          data: permissionRows.map((permission) => ({
            user_id: userId,
            permission_id: permission.id,
          })),
        });
      }
    });

    return {
      id: userId,
      permissions: permissionRows.map((perm) => perm.permission_key),
    };
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
