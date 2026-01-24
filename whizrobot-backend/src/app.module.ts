import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CourseAccessModule } from './course-access/course-access.module';
import { ContentModule } from './content/content.module';
import { LicensesModule } from './licenses/licenses.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecommendModule } from './recommend/recommend.module';
import { RobotModule } from './robot/robot.module';
import { RobotsModule } from './robots/robots.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuditLogsModule,
    AuthModule,
    OrganizationsModule,
    CourseAccessModule,
    LicensesModule,
    ContentModule,
    RobotModule,
    RecommendModule,
    RobotsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
