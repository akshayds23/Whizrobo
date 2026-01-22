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
import { LicensesService } from './licenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateLicenseDto } from './dto/create-license.dto';
import { JwtPayload } from '../auth/auth.service';
import { LicenseStatusService } from './license-status.service';

@Controller('licenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LicensesController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly licenseStatusService: LicenseStatusService,
  ) {}

  @Post()
  @RequirePermissions('ISSUE_LICENSE')
  async issue(@Body() dto: CreateLicenseDto, @Req() req: { user: JwtPayload }) {
    return this.licensesService.issueLicense(dto, req.user.sub);
  }

  @Post(':id/revoke')
  @RequirePermissions('REVOKE_LICENSE')
  async revoke(@Param('id', ParseIntPipe) id: number, @Req() req: { user: JwtPayload }) {
    return this.licensesService.revokeLicense(id, req.user.sub);
  }

  @Get(':id/status')
  @RequirePermissions('VIEW_LICENSE_STATUS')
  async status(@Param('id', ParseIntPipe) id: number) {
    return this.licenseStatusService.getStatusForLicense(id);
  }
}
