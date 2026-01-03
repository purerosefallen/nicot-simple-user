import { ApiProperty } from '@nestjs/swagger';

export class WaitTimeDto {
  @ApiProperty({
    description:
      'The time in milliseconds the user needs to wait before retrying',
    example: 45000,
    required: true,
  })
  waitTimeMs: number;
}
