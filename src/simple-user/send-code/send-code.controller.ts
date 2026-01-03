import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SendCodeService } from './send-code.service';
import {
  ApiRiskControlContext,
  PutRiskControlContext,
  UserRiskControlContext,
} from '../resolver';
import { ApiBlankResponse, DataBody, DataQuery } from 'nicot';
import { ApiInvalidCode, ApiTooManyRequests } from './decorators';
import { SendCodeDto, VerifyCodeDto } from './send-code.dto';

@Controller('send-code')
@ApiTags('send-code')
export class SendCodeController {
  constructor(private service: SendCodeService) {}

  @Post('send')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send verification code',
  })
  @ApiRiskControlContext()
  @ApiBlankResponse()
  @ApiTooManyRequests()
  async sendCode(
    @DataBody() dto: SendCodeDto,
    @PutRiskControlContext() riskControlContext: UserRiskControlContext,
  ) {
    return this.service.sendCode(dto, riskControlContext);
  }

  @Get('verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify code',
  })
  @ApiBlankResponse()
  @ApiInvalidCode()
  async verifyCode(@DataQuery() dto: VerifyCodeDto) {
    return this.service.verifyCode(dto, true);
  }
}
