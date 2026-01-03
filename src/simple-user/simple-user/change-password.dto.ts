import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The current password of the user. Must be provided if applicable.',
    example: 'currentpassword',
  })
  currentPassword?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The new password to set for the user',
    example: 'newsecurepassword',
  })
  newPassword: string;
}
