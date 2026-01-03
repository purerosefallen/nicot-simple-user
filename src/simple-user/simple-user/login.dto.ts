import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailDto } from './email.dto';

export class LoginDto extends EmailDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The login code sent to the email address (MUST present if no password)',
    example: '123456',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The password for login (if applicable)',
    example: 'yourpassword',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'The new password to set for the user (if applicable, e.g., during registration)',
    example: 'newsecurepassword',
  })
  setPassword?: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'The authentication token for the user',
    minLength: 64,
    maxLength: 64,
    example: 'x'.repeat(64),
  })
  token: string;
  @ApiProperty({
    description: 'The expiration time of the authentication token',
    example: new Date(),
  })
  tokenExpiresAt: Date;
  @ApiProperty({
    description: 'The ID of the logged-in user',
    example: 123,
  })
  userId: number;
}
