import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimpleUserService } from '../simple-user/simple-user.service';
import { SimpleUser } from '../simple-user.entity';
import {
  ApiRiskControlContext,
  InjectCurrentUser,
  PutRiskControlContext,
  UserRiskControlContext,
} from '../resolver';
import { ApiBlankResponse, ApiError, DataBody } from 'nicot';
import { ChangePasswordDto } from '../simple-user/change-password.dto';
import { ApiInvalidCode } from '../send-code/decorators';
import { ChangeEmailDto } from '../simple-user/change-email.dto';

@Controller('user-center')
@ApiTags('user-center')
export class UserCenterController {
  constructor(
    private userService: SimpleUserService,
    @InjectCurrentUser()
    private currentUser: SimpleUser,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user information',
  })
  /*
  @ApiOkResponse({
    type: new RestfulFactory(SimpleUser, { relations: [] })
      .entityReturnMessageDto,
  })*/
  async getCurrentUser() {
    return this.userService.findOne(this.currentUser.id);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Change current user password',
  })
  // @ApiRiskControlContext()
  @ApiBlankResponse()
  @ApiError(403, 'Incorrect current password')
  async changePassword(
    @DataBody() dto: ChangePasswordDto,
    @PutRiskControlContext() ctx: UserRiskControlContext,
  ) {
    return this.userService.changePassword(this.currentUser, dto, ctx);
  }

  @Post('change-email')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Change current user email',
  })
  @ApiInvalidCode()
  @ApiBlankResponse()
  async changeEmail(@DataBody() dto: ChangeEmailDto) {
    return this.userService.changeEmail(this.currentUser, dto);
  }
}
