import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('content')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('platform/upload')
  @RequirePermissions('UPLOAD_PLATFORM_CONTENT')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isCsv =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel';
        if (!isCsv) {
          return cb(new BadRequestException('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPlatform(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    return this.contentService.processUpload({
      fileBuffer: file.buffer,
      actorUserId: req.user.sub,
      source: 'WHIZROBOT',
      orgId: null,
    });
  }

  @Post('org/upload')
  @RequirePermissions('UPLOAD_ORG_CONTENT')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isCsv =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel';
        if (!isCsv) {
          return cb(new BadRequestException('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadOrg(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (req.user.org_id == null) {
      throw new BadRequestException('org_id is required for org uploads');
    }

    return this.contentService.processUpload({
      fileBuffer: file.buffer,
      actorUserId: req.user.sub,
      source: 'SCHOOL',
      orgId: req.user.org_id,
    });
  }
}
