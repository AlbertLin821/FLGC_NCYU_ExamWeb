import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;
}

@Controller('api/teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.teachersService.findAll();
  }

  @Get('me')
  getProfile(@Request() req: any) {
    return this.teachersService.findById(req.user.id);
  }

  @Patch(':id/password')
  updatePassword(@Param('id') id: string, @Body('password') pass: string) {
    return this.teachersService.updatePassword(+id, pass);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  invite(@Body('email') email: string) {
    return this.teachersService.inviteTeacher(email);
  }
}
