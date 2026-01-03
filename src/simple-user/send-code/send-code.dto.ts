import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailDto } from '../simple-user/email.dto';

export enum CodePurpose {
  Login = 'Login',
  ResetPassword = 'ResetPassword',
  ChangeEmail = 'ChangeEmail',
}

export class SendCodeDto extends EmailDto {
  @IsEnum(CodePurpose)
  @ApiProperty({
    description: 'The purpose of the code being sent',
    example: CodePurpose.Login,
    enum: CodePurpose,
    required: true,
  })
  codePurpose: CodePurpose;
}

export class VerifyCodeDto extends SendCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The verification code received via email',
    example: '123456',
    required: true,
  })
  code: string;
}
