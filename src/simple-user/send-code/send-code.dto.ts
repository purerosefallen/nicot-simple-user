import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactDto } from '../simple-user/contact.dto';
import { EmailDto } from '../simple-user/email.dto';
import { MobileDto } from '../simple-user/mobile.dto';

export enum CodePurpose {
  Login = 'Login',
  ResetPassword = 'ResetPassword',
  ChangeEmail = 'ChangeEmail',
  ChangeMobile = 'ChangeMobile',
  Unregister = 'Unregister',
}

export class SendCodeDto extends ContactDto {
  @IsEnum(CodePurpose)
  @ApiProperty({
    description: 'The purpose of the code being sent',
    example: CodePurpose.Login,
    enum: CodePurpose,
    required: true,
  })
  codePurpose: CodePurpose;
}

export class EmailSendCodeDto extends EmailDto {
  @IsEnum(CodePurpose)
  @ApiProperty({
    description: 'The purpose of the code being sent',
    example: CodePurpose.Login,
    enum: CodePurpose,
    required: true,
  })
  codePurpose: CodePurpose;
}

export class SmsSendCodeDto extends MobileDto {
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
    description: 'The verification code received via email or SMS',
    example: '123456',
    required: true,
  })
  code: string;
}
