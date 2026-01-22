import { Module } from '@nestjs/common';
import { RobotController } from './robot.controller';
import { RobotService } from './robot.service';
import { RobotGuard } from './robot.guard';
import { RobotUsageService } from './robot-usage.service';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
  imports: [LicensesModule],
  controllers: [RobotController],
  providers: [RobotService, RobotUsageService, RobotGuard],
})
export class RobotModule {}
