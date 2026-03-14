import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

@ValidatorConstraint({ async: false })
class ExactlyOneOfEmailOrMobileConstraint
  implements ValidatorConstraintInterface
{
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    const hasEmail = obj.email != null && obj.email !== '';
    const hasMobile = obj.mobile != null && obj.mobile !== '';
    return hasEmail !== hasMobile;
  }
  defaultMessage() {
    return 'Exactly one of email or mobile must be provided';
  }
}

export class ContactDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'The email address',
    example: 'someuser@example.com',
    required: false,
  })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The mobile phone number',
    example: '86 13800138000',
    required: false,
  })
  mobile?: string;

  @Validate(ExactlyOneOfEmailOrMobileConstraint)
  @ApiHideProperty()
  readonly _contactValidation?: any;
}

export class ContactAndCodeDto extends ContactDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The verification code',
    example: '123456',
  })
  code: string;
}

export function getContactKey(dto: {
  email?: string;
  mobile?: string;
}): string {
  return dto.email ? `email:${dto.email}` : `mobile:${dto.mobile}`;
}

export function getContactTarget(dto: {
  email?: string;
  mobile?: string;
}): string {
  return dto.email || dto.mobile;
}
