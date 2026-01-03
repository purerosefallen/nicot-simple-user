import {
  ApiError,
  CombinedParamResolver,
  ParamResolver,
  TransformParamResolver,
  TypeFromParamResolver,
} from 'nicot';
import { SimpleUserService } from './simple-user/simple-user.service';
import { ContextIdFactory } from '@nestjs/core';

export const userTokenResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'x-client-token',
  description: 'User authentication token. Present when user is logged in',
});

export const userSsaidResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'x-client-ssaid',
  description:
    'User session identifier. MUST PRESENT in all requests from the client',
  required: true,
});

export const ipResolver = new ParamResolver((req) => {
  const ip = req.ip;
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
});

export const userContextResolver = new CombinedParamResolver({
  token: userTokenResolver,
  ssaid: userSsaidResolver,
  ip: ipResolver,
});

export type UserContext = TypeFromParamResolver<typeof userContextResolver> & {
  forceAllowAnonymous?: boolean;
};

export const userResolver = new TransformParamResolver(
  userContextResolver,
  async (ctx, ref, req) => {
    const userService = await ref.resolve(
      SimpleUserService,
      ContextIdFactory.getByRequest(req),
      { strict: false },
    );
    return await userService.findOrCreateUser(ctx);
  },
).addExtraDecorator(
  () => ApiError(401, 'Invalid user token'),
  '__simple_user_401__',
);

export const userResolverProvider = userResolver.toRequestScopedProvider();
export const InjectCurrentUser = userResolverProvider.inject;
export const PutCurrentUser = userResolver.toParamDecorator();
export const ApiCurrentUser = userResolver.toApiPropertyDecorator();

export const userRiskControlResolver = new CombinedParamResolver({
  ip: ipResolver,
  ssaid: userSsaidResolver,
});
export type UserRiskControlContext = TypeFromParamResolver<
  typeof userRiskControlResolver
>;

export const userRiskControlResolverProvider =
  userRiskControlResolver.toRequestScopedProvider();
export const InjectRiskControlContext = userRiskControlResolverProvider.inject;
export const PutRiskControlContext = userRiskControlResolver.toParamDecorator();
export const ApiRiskControlContext =
  userRiskControlResolver.toApiPropertyDecorator();
