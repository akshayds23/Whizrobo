import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RobotsService } from './robots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('robots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Get()
  @RequirePermissions('MANAGE_ROBOTS')
  async list(@Req() req: { user: JwtPayload }) {
    return this.robotsService.listRobots(req.user);
  }

  @Post(':robotId/refresh')
  @RequirePermissions('MANAGE_ROBOTS')
  async refresh(@Param('robotId', ParseIntPipe) robotId: number) {
    return this.robotsService.requestRefresh(robotId);
  }

  @Post(':robotId/lock')
  @RequirePermissions('MANAGE_ROBOTS')
  async lock(@Param('robotId', ParseIntPipe) robotId: number) {
    return this.robotsService.lockRobot(robotId);
  }
}
