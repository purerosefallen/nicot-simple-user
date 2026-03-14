import { ApiError, ApiErrorTyped, MergeClassOrMethodDecorators } from 'nicot';
import { WaitTimeDto } from './wait-time.dto';

export const ApiTooManyRequests = () =>
  ApiErrorTyped(429, 'Too many requests', WaitTimeDto);

export const ApiSendCodeNotConfigured = () =>
  ApiError(501, 'Code generator not configured or failed to send');

export const ApiInvalidCode = () =>
  MergeClassOrMethodDecorators([
    ApiError(403, 'Invalid verification code (or password when login)'),
    ApiTooManyRequests(),
  ]);
