import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { RobotLoginDto } from './dto/robot-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/login')
  async userLogin(@Body() dto: UserLoginDto) {
    return this.authService.loginUser(dto.email, dto.password);
  }

  @Post('robot/login')
  async robotLogin(@Body() dto: RobotLoginDto) {
    return this.authService.loginRobot(dto.license_key, dto.robot_code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: { user: unknown }) {
    return req.user;
  }
}
