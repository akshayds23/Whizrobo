import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
