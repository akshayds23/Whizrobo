import { Global, Module } from '@nestjs/common';
import { AdminAuditLogService } from './admin-audit-log.service';

@Global()
@Module({
  providers: [AdminAuditLogService],
  exports: [AdminAuditLogService],
})
export class AuditModule {}
