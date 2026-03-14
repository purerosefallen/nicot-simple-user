import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MobileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The mobile phone number',
    example: '86 13800138000',
    required: true,
  })
  mobile: string;
}

export class MobileAndCodeDto extends MobileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The verification code',
    example: '123456',
  })
  code: string;
}
