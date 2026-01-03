import { ApiProperty } from '@nestjs/swagger';

export class UserExistsDto {
  @ApiProperty({
    description: 'Indicates whether the user exists',
    example: true,
  })
  exists: boolean;
}
