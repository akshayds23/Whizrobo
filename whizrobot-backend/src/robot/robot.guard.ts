import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../auth/auth.service';

@Injectable()
export class RobotGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user || user.token_type !== 'ROBOT') {
      throw new ForbiddenException('Robot token required');
    }

    return true;
  }
}
