import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtPayload } from '../auth/auth.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('CREATE_ORG')
  async create(@Body() dto: CreateOrganizationDto, @Req() req: { user: JwtPayload }) {
    return this.organizationsService.create(dto, req.user.sub);
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
}
