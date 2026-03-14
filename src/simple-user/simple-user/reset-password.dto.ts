import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactAndCodeDto } from './contact.dto';

export class ResetPasswordDto extends ContactAndCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The new password to set for the user',
    example: 'newsecurepassword',
  })
  newPassword: string;
}
