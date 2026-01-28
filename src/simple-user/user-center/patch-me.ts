import { RestfulFactory } from 'nicot';
import { UserCenterController } from './user-center.controller';
import { ApiOkResponse } from '@nestjs/swagger';
import { SimpleUserExtraOptions } from '../options';

export const patchUserCenterControllerMe = (extras: SimpleUserExtraOptions) => {
  const factory = new RestfulFactory(extras.userClass, {
    relations: extras.userServiceCrudExtras?.relations || [],
  });

  const userCenterControllerMeDescriptor = Object.getOwnPropertyDescriptor(
    UserCenterController.prototype,
    'getCurrentUser',
  );

  ApiOkResponse({
    type: factory.entityReturnMessageDto,
  })(
    UserCenterController.prototype,
    'getCurrentUser',
    userCenterControllerMeDescriptor,
  );
};
