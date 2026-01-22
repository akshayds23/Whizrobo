import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RobotGuard } from './robot.guard';
import { RobotService } from './robot.service';
import { JwtPayload } from '../auth/auth.service';
import { RobotUsageService } from './robot-usage.service';

@Controller('robot')
@UseGuards(JwtAuthGuard, RobotGuard)
export class RobotController {
  constructor(
    private readonly robotService: RobotService,
    private readonly robotUsageService: RobotUsageService,
  ) {}

  @Get('sync')
  async sync(@Req() req: { user: JwtPayload }) {
    return this.robotService.sync(req.user);
  }

  @Post('refresh')
  async refresh(@Req() req: { user: JwtPayload }) {
    return this.robotService.refresh(req.user);
  }

  @Post('logs')
  async ingestLogs(
    @Body() payload: unknown,
    @Req() req: { user: JwtPayload },
  ) {
    return this.robotUsageService.ingestLogs(req.user, payload);
  }
}
