import { ApiError, ApiErrorTyped, MergeClassOrMethodDecorators } from 'nicot';
import { WaitTimeDto } from './wait-time.dto';

export const ApiTooManyRequests = () =>
  ApiErrorTyped(429, 'Too many requests', WaitTimeDto);

export const ApiInvalidCode = () =>
  MergeClassOrMethodDecorators([
    ApiError(403, 'Invalid email code (or password when login)'),
    ApiTooManyRequests(),
  ]);
