import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateOrganizationRequestDto,
} from './dto/create-organization.dto';
import { JwtPayload } from '../auth/auth.service';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('CREATE_ORG')
  async create(
    @Body() dto: CreateOrganizationRequestDto,
    @Req() req: { user: JwtPayload },
  ) {
    const orgData = dto.organization ?? dto;
    const roles = dto.roles ?? [];
    return this.organizationsService.create(orgData, req.user.sub, roles);
  }

  @Get()
  @RequirePermissions('VIEW_ORG')
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('VIEW_ORG')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.findOne(id);
  }

  @Get(':orgId/roles')
  @RequirePermissions('CREATE_ORG')
  async listRoles(@Param('orgId', ParseIntPipe) orgId: number) {
    return this.organizationsService.listRoles(orgId);
  }

  @Get(':orgId/users')
  @RequirePermissions('CREATE_ORG')
  async listUsers(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.listUsers(
      orgId,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }

  @Put(':orgId/users/:userId/role')
  @RequirePermissions('CREATE_ORG')
  async updateUserRole(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.updateUserRole(
      orgId,
      userId,
      dto.role_id,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }

  @Put(':orgId/users/:userId/permissions')
  @RequirePermissions('CREATE_ORG')
  async updateUserPermissions(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserPermissionsDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.updateUserPermissions(
      orgId,
      userId,
      dto.permissions,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }

  @Get(':orgId/roles/:roleId/permissions')
  @RequirePermissions('CREATE_ORG')
  async getRolePermissions(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.getRolePermissions(
      orgId,
      roleId,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }

  @Put(':orgId/roles/:roleId/permissions')
  @RequirePermissions('CREATE_ORG')
  async updateRolePermissions(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.updateRolePermissions(
      orgId,
      roleId,
      dto,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }

  @Post(':orgId/users')
  @RequirePermissions('CREATE_ORG')
  async createUser(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: CreateOrgUserDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.organizationsService.createUser(
      orgId,
      dto,
      req.user.org_id ?? null,
      Boolean(req.user.is_superadmin),
    );
  }
}
