import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { LicenseStatusService } from './license-status.service';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, LicenseStatusService],
  exports: [LicenseStatusService],
})
export class LicensesModule {}
