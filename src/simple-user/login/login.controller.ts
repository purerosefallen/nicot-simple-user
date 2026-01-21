import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimpleUserService } from '../simple-user/simple-user.service';
import {
  ApiBlankResponse,
  ApiError,
  ApiTypeResponse,
  DataBody,
  DataQuery,
} from 'nicot';
import { UserExistsDto } from '../simple-user/user-exists.dto';
import { EmailAndCodeDto, EmailDto } from '../simple-user/email.dto';
import { LoginDto, LoginResponseDto } from '../simple-user/login.dto';
import {
  ApiRiskControlContext,
  PutRiskControlContext,
  UserRiskControlContext,
} from '../resolver';
import { ApiInvalidCode } from '../send-code/decorators';
import { ResetPasswordDto } from '../simple-user/reset-password.dto';

@Controller('login')
@ApiTags('login')
export class LoginController {
  constructor(private userService: SimpleUserService) {}

  @Get('user-exists')
  @ApiOperation({
    summary: 'Check if a user exists by email',
  })
  @ApiTypeResponse(UserExistsDto)
  async checkUserExists(@DataQuery() dto: EmailDto) {
    return this.userService.checkUserExists(dto.email);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'User login endpoint. The unexisting user will be created automatically.',
  })
  @ApiTypeResponse(LoginResponseDto)
  @ApiRiskControlContext()
  @ApiInvalidCode()
  @ApiError(404, 'User not found when only password is provided')
  async login(
    @DataBody() dto: LoginDto,
    @PutRiskControlContext() rcContext: UserRiskControlContext,
  ) {
    return this.userService.login(dto, rcContext);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset user password using email code.',
  })
  @ApiBlankResponse()
  @ApiInvalidCode()
  async resetPassword(@DataBody() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto);
  }

  @Post('unregister-with-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unregister user using email code.',
  })
  @ApiBlankResponse()
  @ApiInvalidCode()
  async unregisterWithCode(@DataBody() dto: EmailAndCodeDto) {
    return this.userService.unregisterWithEmail(dto);
  }
}
