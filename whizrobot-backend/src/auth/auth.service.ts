import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export type TokenType = 'USER' | 'ROBOT';

export type JwtPayload = {
  sub: number;
  org_id: number | null;
  token_type: TokenType;
  permissions: string[];
  license_expiry: string | null;
  is_superadmin?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const directPermissions = user.permissions.map(
      (userPermission) => userPermission.permission.permission_key,
    );
    const rolePermissions = user.role
      ? user.role.permissions.map(
          (rolePermission) => rolePermission.permission_key,
        )
      : [];
    const permissions = Array.from(
      new Set([...directPermissions, ...rolePermissions]),
    );

    const payload: JwtPayload = {
      sub: user.id,
      org_id: user.org_id ?? null,
      token_type: 'USER',
      permissions,
      license_expiry: null,
      is_superadmin: user.is_superadmin,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: payload.token_type,
    };
  }

  async loginRobot(licenseKey: string, robotCode: string) {
    const robot = await this.prisma.robot.findUnique({
      where: { robot_code: robotCode },
    });

    if (!robot || !robot.is_active) {
      throw new UnauthorizedException('Invalid robot credentials');
    }

    const license = await this.prisma.license.findUnique({
      where: { license_key: licenseKey },
    });

    if (
      !license ||
      !license.is_active ||
      license.robot_id !== robot.id
    ) {
      throw new UnauthorizedException('Invalid license');
    }

    const now = new Date();
    if (license.valid_from > now || license.valid_until < now) {
      throw new UnauthorizedException('License expired');
    }

    const payload: JwtPayload = {
      sub: robot.id,
      org_id: license.org_id,
      token_type: 'ROBOT',
      permissions: [],
      license_expiry: license.valid_until.toISOString(),
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: payload.token_type,
    };
  }
}
