import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailAndCodeDto } from './email.dto';

export class ResetPasswordDto extends EmailAndCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The new password to set for the user',
    example: 'newsecurepassword',
  })
  newPassword: string;
}
