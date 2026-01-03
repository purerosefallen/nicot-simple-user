import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDto {
  @IsEmail()
  @ApiProperty({
    description: 'The email address',
    example: 'someuser@example.com',
    required: true,
  })
  email: string;
}

export class EmailAndCodeDto extends EmailDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The code sent to the email address',
    example: '123456',
  })
  code: string;
}
